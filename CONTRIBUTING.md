# Contributing to Translation Assistant

Thank you for helping improve Translation Assistant. This guide outlines the expectations for collaborating on the project.

## Development Workflow
1. **Fork / branch** – Create a feature branch per change set.
2. **Local preview** – Open `index.html` directly in a browser for manual testing. A lightweight static server (e.g., `python -m http.server`) can also be used.
3. **Coding style** – Keep changes in plain JavaScript/HTML/CSS. Prefer descriptive variable names and concise comments only where logic is non-obvious.
4. **Documentation** – Update `UPDATES.md` with every meaningful change. If you alter architecture or workflows, revise `ARCHITECTURE.md` and/or this document as needed.
5. **Testing** – Manually verify UI workflows in the browser:
   - Upload local files and confirm table rendering, filtering, and exports.
   - If relevant, test GitHub loading (public raw/blob URLs) and ensure alignment warnings behave correctly.
   - Check that smart-punctuation normalization and ISO-8859-1 warnings operate on textareas you touched.
6. **Linting / formatting** – Use consistent two-space indentation within HTML and CSS blocks; follow the existing code style in JavaScript.
7. **Pull request** – Summarize the motivation, key changes, and testing performed. Link to `UPDATES.md` entry if helpful.

## Issue Reporting
- Provide clear reproduction steps and include sample `.properties` snippets when reporting parsing or alignment issues.
- For GitHub-loading problems, list the exact URLs and whether they require authentication.

## Security & Privacy
- The app is client-side only; avoid introducing features that upload or persist files remotely without explicit opt-in.
- When testing with credentials (e.g., personal access tokens), never commit them to the repository.

We appreciate your contributions! Please reach out via issues or pull requests if you have questions about scope or implementation details.
