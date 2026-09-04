/* ============================================================================
   SmarHamr Workbench — Dexie Editor (Integrated with Validator + Cleaner)
   ============================================================================ */

window.smarhamrExport = null;

/* ---------------------------------------------------------
   Update topbar status (Dexie Structure: OK)
--------------------------------------------------------- */
function updateTopbarStatus(msg, color = "#888") {
    const el = document.getElementById("dexieStatus");
    if (el) {
        el.textContent = msg;
        el.style.color = color;
    }
}

/* ---------------------------------------------------------
   Update issue status (below workspace)
--------------------------------------------------------- */
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
   Sync rowCounts after modifications
--------------------------------------------------------- */
function syncRowCounts(exportJson) {
    const metaTables = exportJson.data.tables;
    const dataTables = exportJson.data.data;

    for (const meta of metaTables) {
        const data = dataTables.find(t => t.tableName === meta.name);
        if (data) {
            meta.rowCount = data.rows.length;
        }
    }
}

/* ---------------------------------------------------------
   Load Dexie JSON (after gzip decode)
--------------------------------------------------------- */
function loadDexieJson(json) {
    try {
        window.smarhamrExport = json;

        syncRowCounts(window.smarhamrExport);

        runFullValidation(window.smarhamrExport);

        renderDexieWorkspace(window.smarhamrExport);

        updateTopbarStatus("Dexie Structure: OK", "#88cc88");

        const fileNameEl = document.getElementById("currentFileName");
        if (fileNameEl) fileNameEl.textContent = "Loaded Dexie Export";

    } catch (e) {
        console.error("Dexie load error:", e);
        updateTopbarStatus("Dexie Load Error", "#ff5555");
    }
}

/* ---------------------------------------------------------
   Render Dexie Workspace (JSON viewer)
--------------------------------------------------------- */
function renderDexieWorkspace(exportJson) {
    const ws = document.getElementById("dexieWorkspace");
    if (!ws) return;

    ws.innerHTML = ""; // clear

    const pre = document.createElement("pre");
    pre.style.color = "#eee";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.fontFamily = "monospace";
    pre.textContent = JSON.stringify(exportJson, null, 2);

    ws.appendChild(pre);
}

/* ---------------------------------------------------------
   Save workspace back into export object
--------------------------------------------------------- */
function saveWorkspaceToExport() {
    const ws = document.getElementById("dexieWorkspace");
    if (!ws || !window.smarhamrExport) return;

    try {
        const text = ws.innerText || ws.textContent;
        const parsed = JSON.parse(text);

        window.smarhamrExport = parsed;
        syncRowCounts(window.smarhamrExport);

        updateTopbarStatus("Dexie Structure: OK", "#88cc88");

    } catch (e) {
        updateTopbarStatus("Invalid JSON", "#ff5555");
    }
}
/* ============================================================================
   VALIDATION + SEVERITY CLASSIFICATION
   ============================================================================ */

/* ---------------------------------------------------------
   Run full validation and classify severity
--------------------------------------------------------- */
function runFullValidation(exportJson) {
    const report = DexieValidator.validate(exportJson);

    const structural = report.structuralErrors.length;
    const semantic = report.semanticWarnings.length;
    const logic = report.logicEngineWarnings.length;

    const total = structural + semantic + logic;

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

    // Update topbar too
    if (level === "Fatal") {
        updateTopbarStatus("Dexie Structure: Fatal Issues", "#ff5555");
    } else if (level === "Warning") {
        updateTopbarStatus("Dexie Structure: Warnings", "#ffaa33");
    } else {
        updateTopbarStatus("Dexie Structure: OK", "#88cc88");
    }

    return report;
}

/* ============================================================================
   FIX-ALL LOGIC
   ============================================================================ */

/* ---------------------------------------------------------
   Fix All Issues
--------------------------------------------------------- */
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
        if (fixedCount > 0) {
            result.textContent = `Fixed ${fixedCount} issues.`;
            result.style.color = "#88cc88";
        } else {
            result.textContent = `No issues required fixing.`;
            result.style.color = "#ccc";
        }
    }

    runFullValidation(window.smarhamrExport);
}

/* ============================================================================
   FILE INPUT HANDLING
   ============================================================================ */

/* ---------------------------------------------------------
   Handle file input (JSON or GZ)
--------------------------------------------------------- */
document.getElementById("workbenchFileInput").addEventListener("change", async function (evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const fileNameEl = document.getElementById("currentFileName");
    if (fileNameEl) fileNameEl.textContent = file.name;

    const arrayBuffer = await file.arrayBuffer();
    let text = "";

    if (file.name.endsWith(".gz") || file.name.endsWith(".json.gz")) {
        try {
            const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: "string" });
            text = decompressed;
        } catch (e) {
            updateTopbarStatus("GZ decode failed", "#ff5555");
            return;
        }
    } else {
        text = new TextDecoder().decode(arrayBuffer);
    }

    try {
        const json = JSON.parse(text);
        loadDexieJson(json);
    } catch (e) {
        updateTopbarStatus("Invalid JSON", "#ff5555");
    }
});
/* ============================================================================
   EXPORT PIPELINE
   ============================================================================ */

function onDexieExportRequested() {
    if (!window.smarhamrExport) {
        updateTopbarStatus("No export loaded", "#ff5555");
        return;
    }

    // Validate before export
    const report = runFullValidation(window.smarhamrExport);

    // Auto-fix if needed
    if (
        report.structuralErrors.length ||
        report.semanticWarnings.length ||
        report.logicEngineWarnings.length
    ) {
        window.smarhamrExport = DexieCleaner.fixAll(window.smarhamrExport);
        runFullValidation(window.smarhamrExport);
    }

    // Export as gzipped JSON
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
        console.error("Export error:", e);
        updateTopbarStatus("Export failed", "#ff5555");
    }
}

/* ============================================================================
   LOAD CLEAN SMARHAMR PROFILE
   ============================================================================ */

function onLoadCleanSmarHamrProfile() {
    fetch("clean-smarhamr-dexie.json")
        .then(r => r.json())
        .then(json => {
            loadDexieJson(json);
            updateTopbarStatus("Loaded clean SmarHamr Dexie", "#88cc88");
        })
        .catch(err => {
            console.error(err);
            updateTopbarStatus("Failed to load clean profile", "#ff5555");
        });
}

/* ============================================================================
   INSERT SMARHAMR TUTOR
   ============================================================================ */

function onInsertSmarHamrTutor() {
    if (!window.smarhamrExport) {
        updateTopbarStatus("Load a Dexie export first", "#ff5555");
        return;
    }

    try {
        const tables = window.smarhamrExport.data.data;
        const characters = tables.find(t => t.tableName === "characters");

        const tutor = {
            id: 33300,
            name: "SmarHamr Tutor",
            roleInstruction: "Provide structured guidance and clarity.",
            generalWritingInstructions: "Be concise, helpful, and accurate.",
            initialMessages: [],
            shortcutButtons: [],
            avatar: {},
            scene: {},
            customData: {}
        };

        characters.rows.push(tutor);
        syncRowCounts(window.smarhamrExport);

        renderDexieWorkspace(window.smarhamrExport);
        runFullValidation(window.smarhamrExport);

        updateTopbarStatus("Tutor inserted", "#88cc88");

    } catch (e) {
        console.error(e);
        updateTopbarStatus("Tutor insertion failed", "#ff5555");
    }
}

/* ============================================================================
   INSERT LOGIC ENGINE
   ============================================================================ */

function onInsertLogicEngine() {
    if (!window.smarhamrExport) {
        updateTopbarStatus("Load a Dexie export first", "#ff5555");
        return;
    }

    try {
        const miscTable = window.smarhamrExport.data.data.find(t => t.tableName === "misc");

        const logicEngine = {
            key: "userRoleInstruction",
            value: JSON.stringify({
                "scene.background.url": "default-bg.png",
                "characterName": "SmarHamr Tutor",
                "threadMessages": []
            }, null, 2)
        };

        miscTable.rows.push(logicEngine);

        renderDexieWorkspace(window.smarhamrExport);
        runFullValidation(window.smarhamrExport);

        updateTopbarStatus("Logic engine inserted", "#88cc88");

    } catch (e) {
        console.error(e);
        updateTopbarStatus("Logic engine insertion failed", "#ff5555");
    }
}

/* ============================================================================
   INITIALIZATION
   ============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
    updateTopbarStatus("Ready", "#ccc");

    const fixBtn = document.getElementById("dexie-fixall-btn");
    if (fixBtn) fixBtn.onclick = runFixAllOnCurrentExport;
});
