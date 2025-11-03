let englishContent = {};
let frenchContent = {};
let englishRawLines = [];
let frenchRawValues = {};
let englishKeyOrder = [];
const alignmentData = { duplicateEnglish: [], duplicateFrench: [] };
const fileEncodings = { en: "utf-8", fr: "utf-8" };
const SMART_CHAR_REPLACEMENTS = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u2032": "'",
  "\u2035": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u00AB": '"',
  "\u00BB": '"',
  "\u2033": '"',
  "\u2036": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
  "\u00A0": " ",
  "\u2000": " ",
  "\u2001": " ",
  "\u2002": " ",
  "\u2003": " ",
  "\u2004": " ",
  "\u2005": " ",
  "\u2006": " ",
  "\u2007": " ",
  "\u2008": " ",
  "\u2009": " ",
  "\u200A": " ",
  "\u200B": "",
  "\u200C": "",
  "\u200D": "",
  "\u2060": ""
};
const ISO_8859_1_MAX_CODE_POINT = 0xff;

function isHttpUrl(input) {
  return /^https?:\/\//i.test(input);
}

function resolveFileUrl(input) {
  if (!input) {
    throw new Error("Please provide a file URL.");
  }

  const trimmed = input.trim();
  if (!isHttpUrl(trimmed)) {
    throw new Error("Please provide a valid HTTP(S) URL.");
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    if (host === "github.com") {
      const blobMatch = url.pathname.match(/^\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/);
      if (blobMatch) {
        const [, owner, repo, blobRest] = blobMatch;
        const parts = blobRest.split("/");
        if (parts.length < 2) {
          throw new Error("GitHub URL is missing the branch or file path.");
        }
        const rawBranch = parts.shift();
        const branch = decodeURIComponent(rawBranch);
        const encodedBranch = encodeURIComponent(branch);
        const encodedPath = parts.map(segment => encodeURIComponent(segment)).join("/");
        return `https://raw.githubusercontent.com/${owner}/${repo}/${encodedBranch}/${encodedPath}`;
      }

      const rawMatch = url.pathname.match(/^\/([^\/]+)\/([^\/]+)\/raw\/(.+)$/);
      if (rawMatch) {
        const [, owner, repo, rawRest] = rawMatch;
        const parts = rawRest.split("/");
        if (parts.length < 2) {
          throw new Error("GitHub URL is missing the branch or file path.");
        }
        const rawBranch = parts.shift();
        const branch = decodeURIComponent(rawBranch);
        const encodedBranch = encodeURIComponent(branch);
        const encodedPath = parts.map(segment => encodeURIComponent(segment)).join("/");
        return `https://raw.githubusercontent.com/${owner}/${repo}/${encodedBranch}/${encodedPath}`;
      }
    }

    return trimmed;
  } catch (error) {
    throw new Error("Invalid URL format. Please double-check the address.");
  }
}

function createNamedBlob(arrayBuffer, filename) {
  const label = filename || "file.properties";
  if (typeof File === "function") {
    return new File([arrayBuffer], label, { type: "text/plain" });
  }
  const blob = new Blob([arrayBuffer], { type: "text/plain" });
  try {
    Object.defineProperty(blob, "name", {
      value: label,
      writable: false
    });
  } catch (_) {
    // Ignore if unable to define property.
  }
  return blob;
}

async function fetchGithubFile({ url, fallbackName }) {
  const headers = {};

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const message = `Failed to fetch ${url} (status ${response.status})`;
    throw new Error(message);
  }

  const buffer = await response.arrayBuffer();
  const filename =
    fallbackName ||
    url
      .split("?")[0]
      .split("/")
      .filter(Boolean)
      .pop() ||
    "file.properties";

  return createNamedBlob(buffer, filename);
}

function setButtonLoadingState(button, isLoading, loadingLabel = "Loading...") {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.dataset.originalText || button.textContent;
    button.textContent = loadingLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    delete button.dataset.originalText;
    button.disabled = false;
  }
}

document.getElementById("compareBtn").addEventListener("click", () => {
  const englishFile = document.getElementById("englishFile").files[0];
  const frenchFile = document.getElementById("frenchFile").files[0];

  if (!englishFile || !frenchFile) {
    alert("Please upload both English and French .properties files.");
    return;
  }

  Promise.all([
    readPropertiesFile(englishFile, "en"),
    readPropertiesFile(frenchFile, "fr")
  ]).then(([engData, frData]) => {
    englishContent = engData;
    frenchContent = frData;
    updateKeyCategoryOptions(Object.keys(englishContent));
    renderTable(englishContent, frenchContent);
    updateAlignmentSummary();
  });
});

const loadGithubBtn = document.getElementById("loadGithubBtn");
if (loadGithubBtn) {
  loadGithubBtn.addEventListener("click", async () => {
    const englishPathInput =
      document.getElementById("githubEnglishPath")?.value.trim() || "";
    const frenchPathInput =
      document.getElementById("githubFrenchPath")?.value.trim() || "";

    if (!englishPathInput || !frenchPathInput) {
      alert("Please provide both English and French file paths or URLs.");
      return;
    }

    let englishUrl;
    let frenchUrl;

    try {
      englishUrl = resolveFileUrl(englishPathInput);
      frenchUrl = resolveFileUrl(frenchPathInput);
    } catch (error) {
      alert(error.message);
      return;
    }

    setButtonLoadingState(loadGithubBtn, true);

    try {
      const [englishBlob, frenchBlob] = await Promise.all([
        fetchGithubFile({
          url: englishUrl,
          fallbackName: englishPathInput
        }),
        fetchGithubFile({
          url: frenchUrl,
          fallbackName: frenchPathInput
        })
      ]);

      const [engData, frData] = await Promise.all([
        readPropertiesFile(englishBlob, "en"),
        readPropertiesFile(frenchBlob, "fr")
      ]);

      englishContent = engData;
      frenchContent = frData;
      updateKeyCategoryOptions(Object.keys(englishContent));
      renderTable(englishContent, frenchContent);
      updateAlignmentSummary();
    } catch (error) {
      console.error("GitHub load failed:", error);
      alert(`GitHub load failed: ${error.message}`);
    } finally {
      setButtonLoadingState(loadGithubBtn, false);
    }
  });
}

function decodeFileBuffer(buffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const decoder = new TextDecoder("utf-8");
    return { text: decoder.decode(bytes.subarray(3)), encoding: "utf-8" };
  }

  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      const decoder = new TextDecoder("utf-16le");
      return { text: decoder.decode(bytes.subarray(2)), encoding: "utf-16le" };
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      const decoder = new TextDecoder("utf-16be");
      return { text: decoder.decode(bytes.subarray(2)), encoding: "utf-16be" };
    }
  }

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return { text: decoder.decode(bytes), encoding: "utf-8" };
  } catch (err) {
    const decoder = new TextDecoder("iso-8859-1");
    return { text: decoder.decode(bytes), encoding: "iso-8859-1" };
  }
}

function readPropertiesFile(file, lang) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { text, encoding } = decodeFileBuffer(reader.result);
        const lines = text.split(/\r?\n/);
        const result = {};
        const seenKeys = new Set();
        const duplicateKeys = new Set();

        fileEncodings[lang] = encoding;

        if (lang === "en") {
          englishRawLines = [...lines];
          englishKeyOrder = [];
        }
        if (lang === "fr") {
          frenchRawValues = {};
        }

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;

          const [key, ...valueParts] = trimmed.split("=");
          const cleanKey = key.trim();
          const value = valueParts.join("=").trim();

          if (seenKeys.has(cleanKey)) {
            duplicateKeys.add(cleanKey);
          } else {
            seenKeys.add(cleanKey);
            if (lang === "en") englishKeyOrder.push(cleanKey);
          }

          result[cleanKey] = value;

          if (lang === "fr") {
            frenchRawValues[cleanKey] = value;
          }
        });

        if (lang === "en") {
          alignmentData.duplicateEnglish = Array.from(duplicateKeys).sort((a, b) =>
            a.localeCompare(b)
          );
        }

        if (lang === "fr") frenchContent = result;
        if (lang === "fr") {
          alignmentData.duplicateFrench = Array.from(duplicateKeys).sort((a, b) =>
            a.localeCompare(b)
          );
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function normalizeInputValue(value, selectionStart, selectionEnd) {
  if (typeof value !== "string") {
    return { normalized: "", selectionStart, selectionEnd };
  }

  let normalized = "";
  let newSelectionStart =
    typeof selectionStart === "number" ? selectionStart : selectionStart ?? null;
  let newSelectionEnd =
    typeof selectionEnd === "number" ? selectionEnd : selectionEnd ?? null;

  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    const char = String.fromCodePoint(codePoint);
    const replacement = Object.prototype.hasOwnProperty.call(
      SMART_CHAR_REPLACEMENTS,
      char
    )
      ? SMART_CHAR_REPLACEMENTS[char]
      : char;

    normalized += replacement;
    const charLength = char.length;
    const diff = replacement.length - charLength;

    if (diff !== 0) {
      if (typeof newSelectionStart === "number" && newSelectionStart > index) {
        newSelectionStart += diff;
      }
      if (typeof newSelectionEnd === "number" && newSelectionEnd > index) {
        newSelectionEnd += diff;
      }
    }

    index += charLength;
  }

  return {
    normalized,
    selectionStart:
      typeof newSelectionStart === "number" ? newSelectionStart : selectionStart,
    selectionEnd: typeof newSelectionEnd === "number" ? newSelectionEnd : selectionEnd
  };
}

function collectUnsupportedCharacters(value) {
  if (typeof value !== "string" || !value.length) return [];
  const unsupported = new Set();

  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    if (codePoint > ISO_8859_1_MAX_CODE_POINT) {
      unsupported.add(String.fromCodePoint(codePoint));
    }
    index += codePoint > 0xffff ? 2 : 1;
  }

  return Array.from(unsupported);
}

function applyEncodingHints(textarea, value) {
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const unsupported = collectUnsupportedCharacters(value);

  if (unsupported.length) {
    textarea.classList.add("translation-warning");
    textarea.setAttribute(
      "title",
      `Characters not supported by ISO-8859-1: ${unsupported.join(" ")}`
    );
  } else {
    textarea.classList.remove("translation-warning");
    textarea.removeAttribute("title");
  }
}

function syncRowHighlightState(key, textarea, value) {
  const row = textarea.closest("tr");
  if (!row) return;

  const baseline = frenchRawValues[key] ?? "";
  const normalizedCurrent =
    typeof value === "string" ? value.trim() : String(value ?? "").trim();
  const normalizedBaseline =
    typeof baseline === "string"
      ? baseline.trim()
      : String(baseline ?? "").trim();
  const isMissing = normalizedCurrent === "";
  const isModified = !isMissing && normalizedCurrent !== normalizedBaseline;

  row.classList.toggle("highlight-missing", isMissing);
  row.classList.toggle("highlight-modified", isModified);
}

function extractKeyCategory(key) {
  if (typeof key !== "string" || !key.length) return "";
  const dotIndex = key.indexOf(".");
  return dotIndex === -1 ? key : key.slice(0, dotIndex);
}

function updateKeyCategoryOptions(keys = []) {
  const select = document.getElementById("keyCategory");
  if (!select) return;

  const previousValue = select.value;
  const categories = Array.from(
    new Set(
      keys
        .map(extractKeyCategory)
        .filter(category => category && category.trim().length)
    )
  ).sort((a, b) => a.localeCompare(b));

  select.innerHTML = `<option value="">All keys</option>`;
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });

  if (previousValue && categories.includes(previousValue)) {
    select.value = previousValue;
  } else {
    select.value = "";
  }

}

function renderTable(english, french) {
  const tableSection = document.getElementById("table-section");
  const tableBody = document.querySelector("#translationTable tbody");
  const showOnlyMissing = document.getElementById("toggleMissing")?.checked || false;
  const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();
  const selectedCategory = document.getElementById("keyCategory")?.value || "";

  tableBody.innerHTML = "";
  tableSection.classList.remove("hidden");

  const keysInOrder = englishKeyOrder.length ? englishKeyOrder : Object.keys(english);

  keysInOrder.forEach(key => {
    const englishValue = english[key];
    const engText =
      typeof englishValue === "string" ? englishValue : String(englishValue ?? "");

    if (selectedCategory && extractKeyCategory(key) !== selectedCategory) return;

    const stored = getSavedTranslation(key);
    const hasStored = stored !== null && stored !== undefined;
    const baseline = frenchRawValues[key] ?? "";
    const frText = hasStored ? stored : (french[key] ?? "");
    const normalizedCurrent =
      typeof frText === "string" ? frText.trim() : String(frText ?? "").trim();
    const normalizedBaseline =
      typeof baseline === "string" ? baseline.trim() : String(baseline ?? "").trim();
    const isMissing = normalizedCurrent === "";
    const isModified = !isMissing && normalizedCurrent !== normalizedBaseline;

    if (showOnlyMissing && !isMissing && !isModified) return;

    const keyMatch = key.toLowerCase().includes(searchTerm);
    const engLower = engText.toLowerCase();
    const frLower =
      typeof frText === "string" ? frText.toLowerCase() : String(frText ?? "").toLowerCase();
    const engMatch = engLower.includes(searchTerm);
    const frMatch = frLower.includes(searchTerm);
    const matches = !searchTerm || keyMatch || engMatch || frMatch;
    if (!matches) return;

    const row = document.createElement("tr");
    if (isMissing) row.classList.add("highlight-missing");
    if (isModified) row.classList.add("highlight-modified");

    const highlight = (text, match) => {
      const safeText =
        typeof text === "string" ? text : String(text ?? "");
      if (!match) return escapeHTML(safeText);
      const regex = new RegExp(`(${match})`, "gi");
      return escapeHTML(safeText).replace(regex, "<mark>$1</mark>");
    };

    row.innerHTML = `
      <td>${highlight(key, searchTerm)}</td>
      <td>${highlight(engText, searchTerm)}</td>
      <td>
        <textarea
          data-key="${key}"
          spellcheck="false"
          autocorrect="off"
          autocapitalize="none"
          autocomplete="off"
          inputmode="text"
          oninput="handleTranslationInput('${key}', this)"
        >${escapeHTML(frText)}</textarea>
      </td>
    `;

    tableBody.appendChild(row);

    const textarea = row.querySelector("textarea");
    if (textarea) {
      applyEncodingHints(textarea, textarea.value);
    }
  });
}

function formatKeyList(keys) {
  if (!Array.isArray(keys) || !keys.length) return "";
  if (keys.length <= 5) return keys.join(", ");
  return `${keys.slice(0, 5).join(", ")} ...`;
}

function updateAlignmentSummary() {
  const summaryEl = document.getElementById("alignmentSummary");
  if (!summaryEl) return;

  if (!englishKeyOrder.length) {
    summaryEl.classList.add("hidden");
    summaryEl.innerHTML = "";
    return;
  }

  const englishKeySet = new Set(englishKeyOrder);
  const frenchKeys = Object.keys(frenchContent || {});
  const missingInFrench = englishKeyOrder.filter(
    key => !Object.prototype.hasOwnProperty.call(frenchContent, key)
  );
  const extraInFrench = frenchKeys.filter(key => !englishKeySet.has(key));
  const duplicateEnglish = alignmentData.duplicateEnglish;
  const duplicateFrench = alignmentData.duplicateFrench;

  const issues = [];
  const appendIssue = (label, keys) => {
    if (!keys.length) return;
    const sample = formatKeyList(keys);
    const sampleText = sample ? ` (${escapeHTML(sample)})` : "";
    issues.push(
      `<li><strong>${keys.length}</strong> ${escapeHTML(label)}${sampleText}</li>`
    );
  };

  appendIssue("keys missing in French file", missingInFrench);
  appendIssue("extra keys only in French file", extraInFrench);
  appendIssue("duplicate keys in English file", duplicateEnglish);
  appendIssue("duplicate keys in French file", duplicateFrench);

  summaryEl.classList.remove("hidden");

  if (!issues.length) {
    summaryEl.innerHTML = "<strong>Alignment check:</strong> No structural issues detected.";
  } else {
    summaryEl.innerHTML = `<strong>Alignment check:</strong><ul>${issues.join("")}</ul>`;
  }
}

function getSavedTranslation(key) {
  const stored = localStorage.getItem("translations");
  if (!stored) return null;
  const parsed = JSON.parse(stored);
  if (Object.prototype.hasOwnProperty.call(parsed, key)) {
    return parsed[key];
  }
  return null;
}

function saveTranslation(key, value) {
  const stored = localStorage.getItem("translations");
  const parsed = stored ? JSON.parse(stored) : {};
  parsed[key] = value;
  localStorage.setItem("translations", JSON.stringify(parsed));
}

function handleTranslationInput(key, textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) return;

  const { value } = textarea;
  const { selectionStart, selectionEnd } = textarea;
  const {
    normalized,
    selectionStart: updatedStart,
    selectionEnd: updatedEnd
  } = normalizeInputValue(value, selectionStart, selectionEnd);

  if (normalized !== value) {
    const scrollTop = textarea.scrollTop;
    textarea.value = normalized;
    if (typeof updatedStart === "number" && typeof updatedEnd === "number") {
      textarea.selectionStart = updatedStart;
      textarea.selectionEnd = updatedEnd;
    }
    textarea.scrollTop = scrollTop;
  }

  applyEncodingHints(textarea, textarea.value);
  const toSave = textarea.value.trim();
  saveTranslation(key, toSave);
  syncRowHighlightState(key, textarea, textarea.value);
}

document.getElementById("toggleMissing").addEventListener("change", () => {
  renderTable(englishContent, frenchContent);
});

document.getElementById("searchInput").addEventListener("input", () => {
  renderTable(englishContent, frenchContent);
});

document.getElementById("keyCategory").addEventListener("change", () => {
  renderTable(englishContent, frenchContent);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  exportFrenchFile("all");
});

document.getElementById("exportMissingBtn").addEventListener("click", () => {
  exportFrenchFile("missing");
});

function exportFrenchFile(mode = "all") {
  const stored = localStorage.getItem("translations");
  const updated = stored ? JSON.parse(stored) : {};

  const outputLines = [];

  englishRawLines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      outputLines.push(line);
    } else {
      const [key] = trimmed.split("=");
      const cleanKey = key.trim();
      const newValue =
        escapeForProperties(updated[cleanKey]) ||
        escapeForProperties(frenchRawValues[cleanKey]) ||
        "";

      if (mode === "missing" && newValue) return; // skip filled

      outputLines.push(`${cleanKey}=${newValue}`);
    }
  });

  try {
    const blob = new Blob([outputLines.join("\n")], {
      type: "text/plain;charset=ISO-8859-1"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      mode === "missing"
        ? "Bundle_fr_missing_only.properties"
        : "Bundle_fr_updated.properties";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Export failed:", err);
    alert("Export failed. Check console for details.");
  }
}

document.getElementById("previewBtn").addEventListener("click", () => {
  const previewBox = document.getElementById("previewContainer");
  const previewContent = document.getElementById("previewContent");

  const stored = localStorage.getItem("translations");
  const updated = stored ? JSON.parse(stored) : {};

  const lines = [];

  englishRawLines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      lines.push(line);
    } else {
      const [key] = trimmed.split("=");
      const cleanKey = key.trim();
      const newValue =
        escapeForProperties(updated[cleanKey]) ||
        escapeForProperties(frenchRawValues[cleanKey]) ||
        "";

      lines.push(`${cleanKey}=${newValue}`);
    }
  });

  previewContent.textContent = lines.join("\n");
  previewBox.classList.remove("hidden");
});

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, match => {
    const escape = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return escape[match];
  });
}

function escapeForProperties(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/\t/g, "\\t");
}

// Make columns resizable
document.addEventListener("DOMContentLoaded", () => {
  const resizers = document.querySelectorAll(".resizer");

  resizers.forEach(resizer => {
    const th = resizer.closest("th");
    let startX, startWidth;

    const onMouseMove = e => {
      const newWidth = startWidth + (e.clientX - startX);
      th.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    resizer.addEventListener("mousedown", e => {
      startX = e.clientX;
      startWidth = th.offsetWidth;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });
});
