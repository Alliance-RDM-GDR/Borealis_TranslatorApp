# Translation Assistant

Translation Assistant is a client-side web tool that compares two `.properties` files (typically English and French), highlights missing or changed translations, and helps translators export updated bundles safely. The app works completely in the browser, so your files stay local unless you choose to fetch them from GitHub.

## Key Features
- Upload local English/French `.properties` files or load them directly from GitHub raw/blob URLs.
- Detect missing or modified translations, filter by key group, and search across keys and text.
- Inline editing with smart-punctuation normalization and ISO-8859-1 character warnings.
- Export full or missing-only French bundles and preview the output before download.
- Alignment summary reports duplicate keys and unmatched entries between languages.

## Getting Started
1. Clone or download the repository.
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari). No build step is required.
3. Either upload files via the form or paste GitHub URLs, then press **Compare Files** or **Load from GitHub** respectively.

## Usage Tips
- Use the **Key group** selector to focus on sections (e.g., `datasetfieldtype`).
- Toggle **Show only missing or changed translations** to narrow reviews.
- Hover over a highlighted textarea to see unsupported characters that should be corrected before export.
- Use the preview and export buttons after you finish editing to review the generated French bundle.

## Architecture & Contributing
- See [ARCHITECTURE.md](ARCHITECTURE.md) for a breakdown of the app structure and data flow.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, workflow expectations, and testing guidance.

## Change History
- The ongoing record of enhancements lives in [UPDATES.md](UPDATES.md). Update this document whenever you make notable changes so future contributors have a single source of truth for recent improvements.
