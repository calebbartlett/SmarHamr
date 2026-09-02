/* ============================================================================
   SmarHamr — Dexie Workbench Loader (Simple, Stable, No Tables)
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

        // Persist for future expansion
        localStorage.setItem("smarhamrExport", JSON.stringify(data));

        renderDexieWorkspace(data);

    } catch (err) {
        alert("Invalid JSON or JSON.GZ file.");
        console.error(err);
    }
}

/* ---------------------------------------------------------
   Render full JSON workspace (editable)
--------------------------------------------------------- */

function renderDexieWorkspace(data) {
    const workspace = document.getElementById("dexieWorkspace");
    workspace.innerHTML = "";

    const editor = document.createElement("textarea");
    editor.id = "dexieEditor";
    editor.value = JSON.stringify(data, null, 2);
    workspace.appendChild(editor);

    editor.addEventListener("input", () => {
        try {
            const updated = JSON.parse(editor.value);
            window.smarhamrExport = updated;
            localStorage.setItem("smarhamrExport", JSON.stringify(updated));
        } catch (err) {
            // ignore invalid JSON while typing
        }
    });
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

    const jsonOneLine = JSON.stringify(window.smarhamrExport);
    const gzData = pako.gzip(jsonOneLine);
    const blob = new Blob([gzData], { type: "application/gzip" });

    const filename = `${prefix}.smarhamer.json.gz`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ---------------------------------------------------------
   Initialize on page load
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
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
});
