/* ============================================================================
   SmarHamr Workbench — Shared UI Component
   Top Bar Renderer + Mode Switching Logic
   ============================================================================ */

let smarhamrCurrentMode = "asset";   // "asset", "thread", "dexie"
let smarhamrCurrentFileName = "No File Loaded";

/* Render the top bar HTML */
function renderTopBar() {
    return `
        <div id="topbar-left">${smarhamrCurrentFileName}</div>

        <div id="topbar-center">
            <button class="topbar-button" id="assetModeBtn">Asset Mode</button>
            <button class="topbar-button" id="threadModeBtn">Thread Mode</button>
            <button class="topbar-button" id="dexieModeBtn">Dexie Editor</button>
        </div>

        <div id="topbar-right">
            SmarHamr: Workbench by yggdrasil75
        </div>
    `;
}

/* Inject top bar into page */
function initTopBar() {
    const topbar = document.getElementById("topbar");
    if (!topbar) {
        console.error("Top bar container missing in HTML.");
        return;
    }

    topbar.innerHTML = renderTopBar();

    /* Attach mode buttons */
    document.getElementById("assetModeBtn").onclick = () => switchMode("asset");
    document.getElementById("threadModeBtn").onclick = () => switchMode("thread");
    document.getElementById("dexieModeBtn").onclick = () => switchMode("dexie");

    updateTopBarActiveMode();
}

/* Update filename shown in top bar */
function updateTopBarFileName(name) {
    smarhamrCurrentFileName = name || "No File Loaded";
    const left = document.getElementById("topbar-left");
    if (left) left.textContent = smarhamrCurrentFileName;
}

/* Switch mode (Asset / Thread / Dexie) */
function switchMode(mode) {
    smarhamrCurrentMode = mode;
    updateTopBarActiveMode();

    // Redirect to correct page
    if (mode === "asset") window.location.href = "workbench-asset.html";
    if (mode === "thread") window.location.href = "workbench-thread.html";
    if (mode === "dexie") window.location.href = "workbench-dexie.html";
}

/* Highlight active mode button */
function updateTopBarActiveMode() {
    const modes = ["asset", "thread", "dexie"];
    modes.forEach(mode => {
        const btn = document.getElementById(`${mode}ModeBtn`);
        if (btn) {
            if (smarhamrCurrentMode === mode) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        }
    });
}
