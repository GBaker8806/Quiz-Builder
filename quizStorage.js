// quizStorage.js
// Reusable localStorage + dropdown helper for quiz apps.
//
// Each quiz is stored as:
// {
//   [id]: {
//     name: string,
//     questions: [{ question: string, options: string[], correctIndex: number }],
//     createdAt: number (ms since epoch),
//     updatedAt: number (ms since epoch)
//   },
//   ...
// }
//
// Basic usage (in your quiz page):
//
// import { initSavedQuizControls } from './quizStorage.js';
//
// const storage = initSavedQuizControls({
//   storageKey: 'quizBuilder_savedQuizzes_v1', // optional
//   selectElement: document.getElementById('savedQuizSelect'),
//   loadButton: document.getElementById('loadSavedBtn'),
//   deleteButton: document.getElementById('deleteSavedBtn'),
//   onLoad: ({ id, quiz }) => {
//     // quiz.questions is your questions array
//     currentQuizId = id;
//     questions = shuffle(cloneQuestions(quiz.questions));
//     resetQuizState();
//     renderFirstQuestion();
//   }
// });
//
// // After you parse a new quiz from a file:
// const quizId = storage.saveQuiz({
//   name: quizName,            // e.g. file name or user input
//   questions: parsedQuestions // [{ question, options, correctIndex }, ...]
// });
//
// // You can also read all saved quizzes:
// const allQuizzes = storage.getQuizzes();
//
// NOTE: This module assumes the browser supports ES modules and localStorage.
//

const DEFAULT_STORAGE_KEY = 'quizBuilder_savedQuizzes_v1';

/**
 * Load quizzes from localStorage.
 * @param {string} storageKey
 * @returns {Record<string, any>}
 */
export function loadSavedQuizzes(storageKey = DEFAULT_STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (e) {
    console.warn('quizStorage: could not load saved quizzes', e);
    return {};
  }
}

/**
 * Persist quizzes to localStorage.
 * @param {Record<string, any>} quizzes
 * @param {string} storageKey
 */
export function saveSavedQuizzes(quizzes, storageKey = DEFAULT_STORAGE_KEY) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(quizzes || {}));
  } catch (e) {
    console.warn('quizStorage: could not save quizzes', e);
  }
}

function createQuizId() {
  return 'quiz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function normalizeQuestion(q) {
  if (!q || typeof q !== 'object') return null;

  const question = String(q.question || '').trim();
  if (!question) return null;

  const options = Array.isArray(q.options) ? q.options.map(o => String(o || '')).filter(Boolean) : [];
  if (options.length < 2) return null;

  let idx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
  if (idx < 0 || idx >= options.length) idx = 0;

  return { question, options, correctIndex: idx };
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  const cleaned = [];
  for (const q of questions) {
    const nq = normalizeQuestion(q);
    if (nq) cleaned.push(nq);
  }
  return cleaned;
}

/**
 * Initialize dropdown controls for saved quizzes.
 *
 * @param {Object} config
 * @param {string} [config.storageKey]
 * @param {HTMLSelectElement} config.selectElement
 * @param {HTMLButtonElement} [config.loadButton]
 * @param {HTMLButtonElement} [config.deleteButton]
 * @param {(payload: { id: string, quiz: any }) => void} config.onLoad
 *
 * @returns {{
 *   saveQuiz: (quiz: { name?: string, questions: any[] }) => string | null,
 *   getQuizzes: () => Record<string, any>,
 *   loadQuizById: (id: string) => any | null,
 *   deleteQuizById: (id: string, confirmDelete?: boolean) => void,
 *   refresh: () => void
 * }}
 */
export function initSavedQuizControls(config) {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    selectElement,
    loadButton,
    deleteButton,
    onLoad
  } = config || {};

  if (!selectElement) {
    throw new Error('quizStorage: selectElement is required');
  }

  let quizzes = loadSavedQuizzes(storageKey);
  let currentId = null;

  function refreshSelect() {
    const ids = Object.keys(quizzes);
    selectElement.innerHTML = '';

    if (!ids.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No saved quizzes yet';
      selectElement.appendChild(opt);
      if (loadButton) loadButton.disabled = true;
      if (deleteButton) deleteButton.disabled = true;
      return;
    }

    ids.sort((a, b) => {
      const nameA = (quizzes[a].name || '').toLowerCase();
      const nameB = (quizzes[b].name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    let hasSelection = false;

    for (const id of ids) {
      const quiz = quizzes[id];
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = quiz.name || 'Untitled quiz';
      if (id === currentId) {
        opt.selected = true;
        hasSelection = true;
      }
      selectElement.appendChild(opt);
    }

    if (!hasSelection) {
      selectElement.selectedIndex = 0;
      currentId = selectElement.value || null;
    }

    if (loadButton) loadButton.disabled = !selectElement.value;
    if (deleteButton) deleteButton.disabled = !selectElement.value;
  }

  function saveQuiz(quiz) {
    const cleanedQuestions = normalizeQuestions(quiz && quiz.questions);
    if (!cleanedQuestions.length) {
      console.warn('quizStorage: attempted to save quiz with no valid questions');
      return null;
    }

    const nameRaw = quiz && quiz.name ? String(quiz.name) : '';
    const name = nameRaw.trim() || 'Quiz ' + new Date().toLocaleString();

    // Check if a quiz with this name already exists (case-insensitive)
    let existingId = null;
    for (const [id, qz] of Object.entries(quizzes)) {
      if ((qz.name || '').toLowerCase() === name.toLowerCase()) {
        existingId = id;
        break;
      }
    }

    const now = Date.now();
    let idToUse = existingId || createQuizId();

    quizzes[idToUse] = {
      name,
      questions: cleanedQuestions,
      createdAt: existingId ? quizzes[idToUse].createdAt : now,
      updatedAt: now
    };

    currentId = idToUse;
    saveSavedQuizzes(quizzes, storageKey);
    refreshSelect();

    return idToUse;
  }

  function loadQuizById(id) {
    if (!id || !quizzes[id]) return null;
    const quiz = quizzes[id];
    currentId = id;
    if (typeof onLoad === 'function') {
      onLoad({ id, quiz });
    }
    refreshSelect();
    return quiz;
  }

  function deleteQuizById(id, confirmDelete = true) {
    if (!id || !quizzes[id]) return;

    const quizName = quizzes[id].name || 'this quiz';
    if (confirmDelete) {
      const ok = window.confirm(`Delete "${quizName}" from this browser? This cannot be undone.`);
      if (!ok) return;
    }

    delete quizzes[id];
    if (currentId === id) {
      currentId = null;
    }
    saveSavedQuizzes(quizzes, storageKey);
    refreshSelect();
  }

  // Wire up UI events if buttons are provided
  if (loadButton) {
    loadButton.addEventListener('click', () => {
      const id = selectElement.value;
      if (!id) return;
      loadQuizById(id);
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      const id = selectElement.value;
      if (!id) return;
      deleteQuizById(id, true);
    });
  }

  selectElement.addEventListener('change', () => {
    if (loadButton) loadButton.disabled = !selectElement.value;
    if (deleteButton) deleteButton.disabled = !selectElement.value;
  });

  // Initial render
  refreshSelect();

  return {
    saveQuiz,
    getQuizzes: () => ({ ...quizzes }),
    loadQuizById,
    deleteQuizById,
    refresh: refreshSelect
  };
}
