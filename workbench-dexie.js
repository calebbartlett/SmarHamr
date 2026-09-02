/* ============================================================================
   SmarHamr — Dexie Workbench Loader (Simple, Stable, Unified)
   ============================================================================ */

window.smarhamrExport = null;   // global export object
window.smarhamrCurrentMode = "dexie";  // future-proof

/* ---------------------------------------------------------
   Utility: GZIP decompress + JSON parse
--------------------------------------------------------- */

async function loadFile(file) {
    const isGzip = file.name.endsWith(".gz");

    if (isGzip) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const decompressed = pako.ungzip(uint8, { to: "string" });
        return JSON.parse(decompressed);
    } else {
        const text = await file.text();
        return JSON.parse(text);
    }
}

/* ---------------------------------------------------------
   Load into workspace
--------------------------------------------------------- */

async function handleFileLoad(file) {
    try {
        const data = await loadFile(file);
        window.smarhamrExport = data;

        // Persist for future modes (future expansion)
        localStorage.setItem("smarhamrExport", JSON.stringify(data));

        renderDexieWorkspace(data);
    } catch (err) {
        alert("Invalid JSON or JSON.GZ file.");
        console.error(err);
    }
}

/* ---------------------------------------------------------
   Pretty JSON viewer + editor + search
--------------------------------------------------------- */

function renderDexieWorkspace(data) {
    const workspace = document.getElementById("dexieWorkspace");
    workspace.innerHTML = "";

    // Search bar
    const searchBox = document.createElement("input");
    searchBox.type = "text";
    searchBox.placeholder = "Search JSON...";
    searchBox.className = "search-box";
    searchBox.oninput = () => applySearch(searchBox.value);
    workspace.appendChild(searchBox);

    // Editable JSON area
    const editor = document.createElement("textarea");
    editor.id = "dexieEditor";
    editor.value = JSON.stringify(data, null, 2);
    editor.style.width = "100%";
    editor.style.height = "calc(100vh - 200px)";
    workspace.appendChild(editor);
}

function applySearch(query) {
    const editor = document.getElementById("dexieEditor");
    if (!editor) return;

    const text = editor.value;
    if (!query) {
        editor.value = JSON.stringify(window.smarhamrExport, null, 2);
        return;
    }

    // Simple search: highlight matches
    const regex = new RegExp(query, "gi");
    const highlighted = text.replace(regex, match => `<<${match}>>`);
    editor.value = highlighted;
}

/* ---------------------------------------------------------
   Export: one-line JSON + gzip + user prefix
--------------------------------------------------------- */

function exportGzipped() {
    if (!window.smarhamrExport) {
        alert("Nothing loaded.");
        return;
    }

    const prefix = prompt("Enter file prefix (no extension):");
    if (!prefix) return;

    // One-line JSON
    const jsonOneLine = JSON.stringify(window.smarhamrExport);

    // GZIP
    const gzData = pako.gzip(jsonOneLine);

    // Blob
    const blob = new Blob([gzData], { type: "application/gzip" });

    // Filename
    const filename = `${prefix}.smarhamer.json.gz`;

    // Download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ---------------------------------------------------------
   Hook up loader toolbox buttons
--------------------------------------------------------- */

function initDexieLoader() {
    const fileInput = document.getElementById("workbenchFileInput");
    if (!fileInput) return;

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) handleFileLoad(file);
    });

    // Restore saved export if present
    const saved = localStorage.getItem("smarhamrExport");
    if (saved) {
        try {
            window.smarhamrExport = JSON.parse(saved);
            renderDexieWorkspace(window.smarhamrExport);
        } catch (err) {
            console.warn("Failed to restore saved export:", err);
        }
    }
}

/* ---------------------------------------------------------
   Initialize on page load
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    initDexieLoader();
});
