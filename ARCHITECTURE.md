# Translation Assistant Architecture

Translation Assistant is a static, browser-only application. All logic executes client-side and leverages standard Web APIs—no build tools or external dependencies are required.

## High-Level Overview

```
index.html  →  Defines layout, upload controls, GitHub inputs, data table, and action buttons.
styles.css  →  Handles global styling, filter controls, textarea appearance, and status highlighting.
app.js      →  Contains state management, file decoding, rendering, export, and normalization logic.
assets/     →  Static image or supporting files (optional, not currently used by core flow).
```

## Application State
- **englishContent / frenchContent** – Parsed key-value maps for each language.
- **englishRawLines** – Original English file lines preserved for export ordering.
- **frenchRawValues** – Baseline French values for comparison/highlighting.
- **englishKeyOrder** – Ordered list of English keys to maintain consistent table rendering.
- **alignmentData** – Tracks duplicate keys in each language for the alignment summary panel.
- **Local Storage (`translations`)** – Persists user edits between sessions.

## Core Modules & Functions

### File Loading
- `readPropertiesFile(file, lang)` – Reads uploaded blobs via `FileReader`, auto-detects encoding (UTF-8, UTF-16, ISO-8859-1 fallback), parses `.properties` format, and seeds state.
- `fetchGithubFile({ url, fallbackName })` – Downloads files using the Fetch API (supports raw GitHub URLs); returns `Blob`/`File` objects reused by `readPropertiesFile`.
- `resolveFileUrl(input)` – Converts GitHub “blob/raw” URLs to their corresponding `raw.githubusercontent.com` endpoints.

### Rendering & Filtering
- `renderTable(english, french)` – Builds table rows in original key order, applies category filter, search filter, and combined missing/changed toggle. Highlights missing (`highlight-missing`) and modified (`highlight-modified`) rows.
- `updateKeyCategoryOptions(keys)` – Populates the key-group dropdown based on English prefixes (substring before first `.`).
- `updateAlignmentSummary()` – Compares key sets, reporting missing, extra, and duplicate entries in the info panel.

### Editing & Normalization
- `handleTranslationInput(key, textarea)` – Normalizes clipboard/smart punctuation (`SMART_CHAR_REPLACEMENTS`), enforces ISO-8859-1 compatibility warnings, saves trimmed values to local storage, and refreshes row highlighting.
- `applyEncodingHints(textarea, value)` – Adds tooltip + warning class if unsupported characters are present.
- `escapeHTML` / `escapeForProperties` – Sanitize values for display/export.

### Export & Preview
- `exportFrenchFile(mode)` – Generates a Blob in ISO-8859-1 encoding (`mode` = `all` or `missing`), preserving original comments and ordering from the English source.
- `preview` handler – Renders the same output to the onscreen preview area without triggering a download.

### UI Controls
- Upload buttons trigger the compare flow; GitHub loader reuses the same pipeline after fetching remote files.
- Filters: search input, key-group dropdown, missing/changed toggle.
- Buttons: export (full/missing-only), preview, GitHub load with loading state feedback.

## Data Flow
```
Upload / Fetch → readPropertiesFile → State Update → updateKeyCategoryOptions
                                           ↓
                                      renderTable
                                           ↓
                              localStorage ↔ handleTranslationInput
                                           ↓
                                 exportFrenchFile / preview
```

## Extensibility Notes
- All functionality resides in `app.js`; modularizing into ES modules would require a build step or native module usage.
- For authenticated GitHub access or PR creation, extend the fetch helpers to accept tokens and integrate with the GitHub REST API.
- Automated testing could be introduced by wrapping rendering logic into pure functions and using a headless browser for integration tests.
