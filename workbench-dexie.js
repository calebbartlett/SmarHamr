/* ============================================================================
   SmarHamr Workbench — Unified Dexie Loader + Validator + Cleaner
   ============================================================================ */

window.smarhamrExport = null;

/* ---------------------------------------------------------
   UI Status Helpers
--------------------------------------------------------- */
function updateTopbarStatus(msg, color = "#888") {
    const el = document.getElementById("dexieStatus");
    if (el) {
        el.textContent = msg;
        el.style.color = color;
    }
}

function updateIssueStatus(level, message) {
    const el = document.getElementById("dexieIssueStatus");
    if (!el) return;

    let color = "#ccc";
    if (level === "Fatal") color = "#ff5555";
    else if (level === "Warning") color = "#ffaa33";
    else if (level === "Informational") color = "#88cc88";

    el.style.color = color;
    el.textContent = `${level}: ${message}`;
}

/* ---------------------------------------------------------
   Sync rowCounts
--------------------------------------------------------- */
function syncRowCounts(exportJson) {
    const metaTables = exportJson.data.tables;
    const dataTables = exportJson.data.data;

    for (const meta of metaTables) {
        const data = dataTables.find(t => t.tableName === meta.name);
        if (data) meta.rowCount = data.rows.length;
    }
}

/* ---------------------------------------------------------
   Render Dexie JSON Viewer
--------------------------------------------------------- */
function renderDexieWorkspace(exportJson) {
    const ws = document.getElementById("dexieWorkspace");
    if (!ws) return;

    ws.innerHTML = "";

    const pre = document.createElement("pre");
    pre.style.color = "#eee";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.fontFamily = "monospace";
    pre.textContent = JSON.stringify(exportJson, null, 2);

    ws.appendChild(pre);
}

/* ---------------------------------------------------------
   Full Validation
--------------------------------------------------------- */
function runFullValidation(exportJson) {
    const report = DexieValidator.validate(exportJson);

    const structural = report.structuralErrors.length;
    const semantic = report.semanticWarnings.length;
    const logic = report.logicEngineWarnings.length;

    let level = "Informational";
    let msg = "No issues detected.";

    if (structural > 0) {
        level = "Fatal";
        msg = `${structural} structural issues`;
    } else if (semantic > 0 || logic > 0) {
        level = "Warning";
        msg = `${semantic + logic} non-structural issues`;
    }

    updateIssueStatus(level, msg);

    if (level === "Fatal") updateTopbarStatus("Dexie Structure: Fatal Issues", "#ff5555");
    else if (level === "Warning") updateTopbarStatus("Dexie Structure: Warnings", "#ffaa33");
    else updateTopbarStatus("Dexie Structure: OK", "#88cc88");

    return report;
}
/* ============================================================================
   FIX-ALL LOGIC
   ============================================================================ */

function runFixAllOnCurrentExport() {
    if (!window.smarhamrExport) return;

    const before = DexieValidator.validate(window.smarhamrExport);

    window.smarhamrExport = DexieCleaner.fixAll(window.smarhamrExport);

    const after = DexieValidator.validate(window.smarhamrExport);

    renderDexieWorkspace(window.smarhamrExport);

    const fixedCount =
        (before.structuralErrors.length +
         before.semanticWarnings.length +
         before.logicEngineWarnings.length) -
        (after.structuralErrors.length +
         after.semanticWarnings.length +
         after.logicEngineWarnings.length);

    const result = document.getElementById("dexieFixResult");
    if (result) {
        result.textContent = fixedCount > 0
            ? `Fixed ${fixedCount} issues.`
            : `No issues required fixing.`;
        result.style.color = fixedCount > 0 ? "#88cc88" : "#ccc";
    }

    runFullValidation(window.smarhamrExport);
}

/* ============================================================================
   FILE LOADING (JSON + GZ)
   ============================================================================ */

async function loadDexieFile(file) {
    const fileNameEl = document.getElementById("currentFileName");
    if (fileNameEl) fileNameEl.textContent = file.name;

    const arrayBuffer = await file.arrayBuffer();
    let text = "";

    try {
        if (file.name.endsWith(".gz") || file.name.endsWith(".json.gz")) {
            text = pako.ungzip(new Uint8Array(arrayBuffer), { to: "string" });
        } else {
            text = new TextDecoder().decode(arrayBuffer);
        }
    } catch (e) {
        updateTopbarStatus("GZ decode failed", "#ff5555");
        return;
    }

    try {
        const json = JSON.parse(text);
        loadDexieJson(json);
    } catch (e) {
        updateTopbarStatus("Invalid JSON", "#ff5555");
    }
}

/* ============================================================================
   LOAD DEXIE JSON (POST-PARSE)
   ============================================================================ */

function loadDexieJson(json) {
    try {
        window.smarhamrExport = json;

        syncRowCounts(window.smarhamrExport);
        runFullValidation(window.smarhamrExport);
        renderDexieWorkspace(window.smarhamrExport);

        updateTopbarStatus("Dexie Structure: OK", "#88cc88");

    } catch (e) {
        updateTopbarStatus("Dexie Load Error", "#ff5555");
    }
}
/* ============================================================================
   EXPORT DEXIE JSON.GZ
   ============================================================================ */

function onDexieExportRequested() {
    if (!window.smarhamrExport) {
        updateTopbarStatus("No export loaded", "#ff5555");
        return;
    }

    const report = runFullValidation(window.smarhamrExport);

    // Auto-fix before export
    if (report.structuralErrors.length ||
        report.semanticWarnings.length ||
        report.logicEngineWarnings.length) {

        window.smarhamrExport = DexieCleaner.fixAll(window.smarhamrExport);
        runFullValidation(window.smarhamrExport);
    }

    try {
        const jsonStr = JSON.stringify(window.smarhamrExport, null, 2);
        const gz = pako.gzip(jsonStr);

        const blob = new Blob([gz], { type: "application/gzip" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "smarhamr-dexie.json.gz";
        a.click();

        updateTopbarStatus("Export successful", "#88cc88");

    } catch (e) {
        updateTopbarStatus("Export failed", "#ff5555");
    }
}

/* ============================================================================
   LOAD CLEAN SMARHAMR DEXIE
   ============================================================================ */

function onLoadCleanSmarHamrProfile() {
    fetch("clean-smarhamr-dexie.json")
        .then(r => r.json())
        .then(json => {
            loadDexieJson(json);
            updateTopbarStatus("Loaded clean SmarHamr Dexie", "#88cc88");
        })
        .catch(() => {
            updateTopbarStatus("Failed to load clean profile", "#ff5555");
        });
}

/* ============================================================================
   FILE INPUT LISTENER
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
    updateTopbarStatus("Ready", "#ccc");

    const fileInput = document.getElementById("workbenchFileInput");
    fileInput.addEventListener("change", evt => {
        const file = evt.target.files[0];
        if (file) loadDexieFile(file);
    });

    const fixBtn = document.getElementById("dexie-fixall-btn");
    if (fixBtn) fixBtn.onclick = runFixAllOnCurrentExport;
});
