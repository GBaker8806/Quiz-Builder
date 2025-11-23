# Quiz Builder

Web-based multiple-choice quiz app for studying C-17 Loadmaster MQF-style questions.

This app runs entirely in the browser — no backend, no dependencies. Just open the HTML file and upload your MQF CSV.

## Features

- Upload your MQF-style CSV (e.g. `MQF_May2023_Quizlet_clean.csv`)
- Parses `QUESTION,ANSWER` format:
  - `QUESTION` cell: question stem + choices (e.g., lines starting with `A.`, `B.`, `C.`, `D.`)
  - `ANSWER` cell: correct answer (e.g., `A. Press and hold ...`)
- Supports both multiline and inline options (e.g., `a. 8,400 b. 8,500 c. 10,000 d. 10,355`)
- Randomizes question order each time you upload the file
- Shuffles answer choices per question
- Tracks score and progress as you study

## Usage

1. Clone or download this repository.
2. Open `index.html` (or `mqf_quiz_builder.html`) in your browser.
3. Click **"Question file (.csv or .txt)"**.
4. Select your MQF CSV file (with header `QUESTION,ANSWER`).
5. Go through the quiz, checking answers and moving to the next question.
