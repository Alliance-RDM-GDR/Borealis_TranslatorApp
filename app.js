let englishContent = {};
let frenchContent = {};
let englishRawLines = [];
let frenchRawValues = {};

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
    renderTable(englishContent, frenchContent);
  });
});

function readPropertiesFile(file, lang) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split(/\r?\n/);
      const result = {};

      if (lang === "en") englishRawLines = [...lines];

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;

        const [key, ...valueParts] = trimmed.split("=");
        const cleanKey = key.trim();
        const value = valueParts.join("=").trim();

        result[cleanKey] = value;

        if (lang === "fr") {
          frenchRawValues[cleanKey] = value;
        }
      });

      if (lang === "fr") frenchContent = result;

      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsText(file, "ISO-8859-1");
  });
}

function renderTable(english, french) {
  const tableSection = document.getElementById("table-section");
  const tableBody = document.querySelector("#translationTable tbody");
  const showOnlyMissing = document.getElementById("toggleMissing")?.checked || false;
  const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();

  tableBody.innerHTML = "";
  tableSection.classList.remove("hidden");

  Object.entries(english).forEach(([key, engText]) => {
    const stored = getSavedTranslation(key);
    const frText = stored || french[key] || "";
    const isMissing = !frText;

    if (showOnlyMissing && !isMissing) return;

    const keyMatch = key.toLowerCase().includes(searchTerm);
    const engMatch = engText.toLowerCase().includes(searchTerm);
    const frMatch = frText.toLowerCase().includes(searchTerm);
    const matches = !searchTerm || keyMatch || engMatch || frMatch;
    if (!matches) return;

    const row = document.createElement("tr");
    if (isMissing) row.classList.add("highlight-missing");

    const highlight = (text, match) => {
      if (!match) return escapeHTML(text);
      const regex = new RegExp(`(${match})`, "gi");
      return escapeHTML(text).replace(regex, "<mark>$1</mark>");
    };

    row.innerHTML = `
      <td>${highlight(key, searchTerm)}</td>
      <td>${highlight(engText, searchTerm)}</td>
      <td>
        <textarea data-key="${key}" oninput="saveTranslation('${key}', this.value.trim())">${escapeHTML(frText)}</textarea>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function getSavedTranslation(key) {
  const stored = localStorage.getItem("translations");
  if (!stored) return null;
  const parsed = JSON.parse(stored);
  return parsed[key] || null;
}

function saveTranslation(key, value) {
  const stored = localStorage.getItem("translations");
  const parsed = stored ? JSON.parse(stored) : {};
  parsed[key] = value;
  localStorage.setItem("translations", JSON.stringify(parsed));
}

document.getElementById("toggleMissing").addEventListener("change", () => {
  renderTable(englishContent, frenchContent);
});

document.getElementById("searchInput").addEventListener("input", () => {
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
