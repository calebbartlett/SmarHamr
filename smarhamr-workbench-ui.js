/* ============================================================================
   SmarHamr Workbench — Shared UI + Unified Refresh
   ============================================================================ */

window.smarhamrExport = null;
window.smarhamrCurrentMode = null;

/* ---------------------------------------------------------
   Top Bar Initialization (UNCHANGED)
--------------------------------------------------------- */

function initTopBar() {
    const bar = document.getElementById("topbar");
    if (!bar) return;

    // DO NOT CHANGE YOUR TOP BAR
    bar.innerHTML = `
        <div class="topbar-inner">
            <div class="topbar-title">SmarHamr</div>
        </div>
    `;

    // Restore saved export if present
    const saved = localStorage.getItem("smarhamrExport");
    if (saved) {
        try {
            window.smarhamrExport = JSON.parse(saved);
            refreshCurrentMode();
        } catch (e) {
            console.warn("Failed to parse saved export:", e);
        }
    }
}

/* ---------------------------------------------------------
   Mode Refresh Dispatcher
--------------------------------------------------------- */

function refreshCurrentMode() {
    if (!window.smarhamrExport) return;

    if (window.smarhamrCurrentMode === "dexie") {
        refreshDexieMode();
    } else if (window.smarhamrCurrentMode === "asset") {
        refreshAssetMode();
    } else if (window.smarhamrCurrentMode === "thread") {
        refreshThreadMode();
    }
}

/* ---------------------------------------------------------
   Dexie Mode — Left Nav + Workspace
--------------------------------------------------------- */

function refreshDexieMode() {
    const list = document.getElementById("dexieTableList");
    if (!list || !window.smarhamrExport) return;

    const tables = Object.keys(window.smarhamrExport);
    list.innerHTML = "";

    tables.forEach(name => {
        const btn = document.createElement("button");
        btn.className = "button-small";
        btn.textContent = name;
        btn.onclick = () => renderDexieTable(name);
        list.appendChild(btn);
    });
}

function renderDexieTable(tableName) {
    const workspace = document.getElementById("dexieWorkspace");
    if (!workspace || !window.smarhamrExport) return;

    const rows = window.smarhamrExport[tableName] || [];
    workspace.innerHTML = "";

    const header = document.createElement("div");
    header.className = "panel-subheader";
    header.textContent = `Table: ${tableName} (${rows.length} rows)`;
    workspace.appendChild(header);

    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(rows, null, 2);
    workspace.appendChild(pre);
}

/* ---------------------------------------------------------
   Asset Mode — Left Nav + Workspace
--------------------------------------------------------- */

function refreshAssetMode() {
    const list = document.getElementById("assetList");
    if (!list || !window.smarhamrExport) return;

    const assets = window.smarhamrExport.assets || [];
    list.innerHTML = "";

    assets.forEach(asset => {
        const btn = document.createElement("button");
        btn.className = "button-small";
        btn.textContent = asset.name || "(unnamed asset)";
        btn.onclick = () => renderAsset(asset);
        list.appendChild(btn);
    });
}

function renderAsset(asset) {
    const workspace = document.getElementById("assetWorkspace");
    if (!workspace) return;

    workspace.innerHTML = "";

    const header = document.createElement("div");
    header.className = "panel-subheader";
    header.textContent = asset.name || "(unnamed asset)";
    workspace.appendChild(header);

    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(asset, null, 2);
    workspace.appendChild(pre);
}

/* ---------------------------------------------------------
   Thread Mode — Left Nav + Workspace
--------------------------------------------------------- */

function refreshThreadMode() {
    const list = document.getElementById("threadList");
    if (!list || !window.smarhamrExport) return;

    const threads = window.smarhamrExport.threads || [];
    list.innerHTML = "";

    threads.forEach(thread => {
        const btn = document.createElement("button");
        btn.className = "button-small";
        btn.textContent = thread.title || "(untitled thread)";
        btn.onclick = () => renderThread(thread);
        list.appendChild(btn);
    });
}

function renderThread(thread) {
    const workspace = document.getElementById("threadWorkspace");
    if (!workspace) return;

    workspace.innerHTML = "";

    const header = document.createElement("div");
    header.className = "panel-subheader";
    header.textContent = thread.title || "(untitled thread)";
    workspace.appendChild(header);

    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(thread, null, 2);
    workspace.appendChild(pre);
}
