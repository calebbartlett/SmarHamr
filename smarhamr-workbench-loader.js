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

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (smarhamrCurrentMode === "dexie" && typeof loadDexieExportFile === "function") {
            loadDexieExportFile(file);
        }
        if (smarhamrCurrentMode === "asset") {
            alert("Asset loader not implemented yet.");
        }
        if (smarhamrCurrentMode === "thread") {
            alert("Thread loader not implemented yet.");
        }
    });
}

function openWorkbenchFile() {
    document.getElementById("workbenchFileInput").click();
}

function saveWorkbenchChanges() {
    alert("Changes saved to memory.");
}

function exportWorkbenchData() {
    if (smarhamrCurrentMode === "dexie" && typeof exportDexieJson === "function") {
        exportDexieJson();
    }
}
