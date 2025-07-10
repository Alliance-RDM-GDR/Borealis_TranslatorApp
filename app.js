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

      if (lang === "en") {
        englishRawLines = [...lines];
      }

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

      if (lang === "fr") {
        frenchContent = result;
      }

      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsText(file, "ISO-8859-1");
  });
}

function escapeHTML(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;");
}

function renderTable(english, french) {
  const tableSection = document.getElementById("table-section");
  const tableBody = document.querySelector("#translationTable tbody");
  const showOnlyMissing = document.getElementById("toggleMissing")?.checked || false;
  const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();

  tableBody.innerHTML = "";
  tableSection.classList.remove("hidden");

  Object.entries(english).forEach(([key, engText]) => {
    const frText = french[key] || "";
    const isMissing = !frText;

    if (showOnlyMissing && !isMissing) return;

    const keyMatch = key.toLowerCase().includes(searchTerm);
    const engMatch = engText.toLowerCase().includes(searchTerm);
    const frMatch = frText.toLowerCase().includes(searchTerm);
    const matches = !searchTerm || keyMatch || engMatch || frMatch;

    if (!matches) return;

    const row = document.createElement("tr");
    if (isMissing) {
      row.classList.add("highlight-missing");
    }

    const highlight = (text, match) => {
      if (!match) return escapeHTML(text);
      const regex = new RegExp(`(${match})`, 'gi');
      return escapeHTML(text).replace(regex, '<mark>$1</mark>');
    };

    row.innerHTML = `
      <td>${highlight(key, searchTerm)}</td>
      <td>${highlight(engText, searchTerm)}</td>
      <td><input type="text" data-key="${key}" value="${escapeHTML(frText)}"></td>
    `;

    tableBody.appendChild(row);
  });
}

document.getElementById("toggleMissing").addEventListener("change", () => {
  renderTable(englishContent, frenchContent);
});

document.getElementById("searchInput").addEventListener("input", () => {
  renderTable(englishContent, frenchContent);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  console.log("Export button clicked");

  const inputs = document.querySelectorAll("#translationTable input");
  const updated = {};

  inputs.forEach(input => {
    const key = input.getAttribute("data-key");
    const value = input.value.trim();
    updated[key] = value;
  });

  const outputLines = [];

  englishRawLines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      outputLines.push(line);
    } else {
      const [key, ..._] = trimmed.split("=");
      const cleanKey = key.trim();
      const newValue =
        escapeForProperties(updated[cleanKey]) ||
        escapeForProperties(frenchRawValues[cleanKey]) ||
        "";

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
    link.download = "Bundle_fr_updated.properties";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const fallbackLink = document.createElement("a");
    fallbackLink.href = url;
    fallbackLink.download = "Bundle_fr_updated.properties";
    fallbackLink.textContent = "Manual download";
    fallbackLink.style.display = "block";
    fallbackLink.style.marginTop = "1rem";
    fallbackLink.style.fontWeight = "bold";
    fallbackLink.style.color = "#004080";
    fallbackLink.id = "manual-download-link";

    const old = document.getElementById("manual-download-link");
    if (old) old.remove();
    document.body.appendChild(fallbackLink);
  } catch (err) {
    console.error("Export failed:", err);
    alert("Export failed. Check console for details.");
  }
});

document.getElementById("previewBtn").addEventListener("click", () => {
  const previewBox = document.getElementById("previewContainer");
  const previewContent = document.getElementById("previewContent");

  const inputs = document.querySelectorAll("#translationTable input");
  const updated = {};

  inputs.forEach(input => {
    const key = input.getAttribute("data-key");
    const value = input.value.trim();
    updated[key] = value;
  });

  const lines = [];

  englishRawLines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      lines.push(line);
    } else {
      const [key, ..._] = trimmed.split("=");
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

function escapeForProperties(value) {
  if (typeof value !== "string") {
    value = "";
  }
  return value.replace(/\\/g, "\\\\")
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "")
              .replace(/\t/g, "\\t");
}
