/* ============================================================================
   SmarHamr Workbench — Universal Loader Toolbox
   smarhamr-workbench-loader.js
   ============================================================================ */

function renderLoaderToolbox() {
    return `
        <div style="text-align:center; padding:10px; border-bottom:1px solid var(--border);">

            <button class="button-small" onclick="openWorkbenchFile()">File</button>
            <button class="button-small" onclick="saveWorkbenchChanges()">Save</button>
            <button class="button-small" onclick="exportWorkbenchData()">Export</button>

            <input type="file" id="workbenchFileInput"
                   accept=".json,.gz,.json.gz"
                   style="display:none;">
        </div>
    `;
}

function initLoaderToolbox() {
    const box = document.getElementById("loaderToolbox");
    if (box) box.innerHTML = renderLoaderToolbox();

    const fileInput = document.getElementById("workbenchFileInput");
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                // Dexie mode loader
                if (typeof loadDexieExportFile === "function") {
                    loadDexieExportFile(file);
                }
                // Asset mode loader (future)
                // Thread mode loader (future)
            }
        });
    }
}

/* ---------------------------------------------------------
   Toolbox Actions
--------------------------------------------------------- */

function openWorkbenchFile() {
    document.getElementById("workbenchFileInput").click();
}

function saveWorkbenchChanges() {
    alert("Changes saved to memory.");
}

function exportWorkbenchData() {
    if (typeof exportDexieJson === "function") {
        exportDexieJson();
    }
}
