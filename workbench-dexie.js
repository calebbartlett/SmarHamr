/* ============================================================================
   SmarHamr — Dexie Workbench Loader (Simple, Safe Editing)
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
        renderDexieTableList(data);

    } catch (err) {
        alert("Invalid JSON or JSON.GZ file.");
        console.error(err);
    }
}

/* ---------------------------------------------------------
   Render left nav table list (skip structural metadata)
--------------------------------------------------------- */

function renderDexieTableList(data) {
    const list = document.getElementById("dexieTableList");
    if (!list) return;

    list.innerHTML = "";

    // Dexie export structure: { formatName, formatVersion, data: { tables: [...] } }
    const root = data.data && Array.isArray(data.data.tables)
        ? data.data.tables
        : null;

    if (!root) {
        list.innerHTML = `<p style="color:#777;">No Dexie tables found.</p>`;
        return;
    }

    root.forEach(table => {
        const name = table.name || "(unnamed table)";
        const btn = document.createElement("button");
        btn.className = "button-small";
        btn.textContent = `${name} (${table.rowCount ?? "?"} rows)`;
        btn.onclick = () => renderDexieTable(table);
        list.appendChild(btn);
    });
}

/* ---------------------------------------------------------
   Safe editable fields inspector
--------------------------------------------------------- */

function getSafeEditableFields(obj, prefix = "") {
    const safe = [];

    for (const key in obj) {
        const value = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;

        // Skip structural metadata
        if (["formatName", "formatVersion", "data", "$types", "id", "uuid",
             "creationTime", "lastMessageTime"].includes(key)) {
            continue;
        }

        // Primitive values are safe
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            safe.push({ path, value });
            continue;
        }

        // Arrays of primitives are safe
        if (Array.isArray(value) &&
            value.every(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
            safe.push({ path, value });
            continue;
        }

        // Simple objects of primitives are safe
        if (typeof value === "object" && value !== null) {
            const keys = Object.keys(value);
            const allPrimitive = keys.every(k =>
                typeof value[k] === "string" ||
                typeof value[k] === "number" ||
                typeof value[k] === "boolean"
            );

            if (allPrimitive) {
                safe.push({ path, value });
                continue;
            }

            // Recurse deeper
            safe.push(...getSafeEditableFields(value, path));
        }
    }

    return safe;
}

/* ---------------------------------------------------------
   Render safe fields panel
--------------------------------------------------------- */

function renderSafeFieldsPanel(data) {
    let panel = document.getElementById("safeFieldsPanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "safeFieldsPanel";
        document.getElementById("dexieWorkspace").appendChild(panel);
    }

    const safe = getSafeEditableFields(data);

    panel.innerHTML = `<h3>Safe Editable Fields</h3>`;

    if (safe.length === 0) {
        panel.innerHTML += `<p style="color:#777;">No safe fields detected.</p>`;
        return;
    }

    safe.forEach(item => {
        const div = document.createElement("div");
        div.style.marginBottom = "6px";
        div.textContent = `${item.path}: ${JSON.stringify(item.value)}`;
        panel.appendChild(div);
    });
}

/* ---------------------------------------------------------
   Render table content (safe editing per table)
--------------------------------------------------------- */

function renderDexieTable(table) {
    const workspace = document.getElementById("dexieWorkspace");
    workspace.innerHTML = "";

    const header = document.createElement("div");
    header.style.color = "#ccc";
    header.style.marginBottom = "10px";
    header.textContent = `Table: ${table.name || "(unnamed table)"}`;
    workspace.appendChild(header);

    const editor = document.createElement("textarea");
    editor.id = "dexieEditor";
    editor.value = JSON.stringify(table.rows ?? table.data ?? [], null, 2);
    workspace.appendChild(editor);

    editor.addEventListener("input", () => {
        try {
            const updated = JSON.parse(editor.value);

            // Update the table rows in the export safely
            const tables = window.smarhamrExport?.data?.tables;
            if (Array.isArray(tables)) {
                const idx = tables.findIndex(t => t.name === table.name);
                if (idx !== -1) {
                    tables[idx].rows = updated;
                    localStorage.setItem("smarhamrExport", JSON.stringify(window.smarhamrExport));
                    renderSafeFieldsPanel(window.smarhamrExport);
                }
            }
        } catch (err) {
            // ignore invalid JSON while typing
        }
    });

    renderSafeFieldsPanel(window.smarhamrExport);
}

/* ---------------------------------------------------------
   Render full JSON workspace (initial load)
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
            renderSafeFieldsPanel(updated);
        } catch (err) {
            // ignore invalid JSON while typing
        }
    });

    renderSafeFieldsPanel(data);
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
            renderDexieTableList(window.smarhamrExport);
        } catch (err) {
            console.warn("Failed to restore saved export:", err);
        }
    }
});
