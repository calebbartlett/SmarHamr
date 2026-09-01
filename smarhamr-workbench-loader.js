/* ============================================================================
   SmarHamr Workbench — Unified Loader (One Export, Three Lenses)
   ============================================================================ */

window.smarhamrExport = null;

/* ---------------------------------------------------------
   Render Toolbox
--------------------------------------------------------- */

function renderLoaderToolbox() {
    return `
        <div style="text-align:center; padding:10px; border-bottom:1px solid var(--border);">
            <button class="button-small" onclick="openWorkbenchFile()">File</button>
            <button class="button-small" onclick="saveWorkbenchChanges()">Save</button>
            <button class="button-small" onclick="exportWorkbenchData()">Export</button>
            <input type="file" id="workbenchFileInput" accept=".json,.gz,.json.gz" style="display:none;">
        </div>
    `;
}

function initLoaderToolbox() {
    const box = document.getElementById("loaderToolbox");
    if (!box) return;
    box.innerHTML = renderLoaderToolbox();

    const fileInput = document.getElementById("workbenchFileInput");
    if (!fileInput) return;

    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        window.smarhamrExport = JSON.parse(text);

        localStorage.setItem("smarhamrExport", JSON.stringify(window.smarhamrExport));

        refreshCurrentMode();
    });
}

/* ---------------------------------------------------------
   Toolbox Actions
--------------------------------------------------------- */

function openWorkbenchFile() {
    document.getElementById("workbenchFileInput").click();
}

function saveWorkbenchChanges() {
    if (!window.smarhamrExport) return;
    localStorage.setItem("smarhamrExport", JSON.stringify(window.smarhamrExport));
    alert("Saved.");
}

function exportWorkbenchData() {
    if (!window.smarhamrExport) return;

    const blob = new Blob(
        [JSON.stringify(window.smarhamrExport, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smarhamr-export.json";
    a.click();
    URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   Mode Refresh Dispatcher
--------------------------------------------------------- */

function refreshCurrentMode() {
    if (smarhamrCurrentMode === "dexie") refreshDexieMode();
    if (smarhamrCurrentMode === "asset") refreshAssetMode();
    if (smarhamrCurrentMode === "thread") refreshThreadMode();
}
