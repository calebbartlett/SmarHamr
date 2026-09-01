/* ============================================================================
   Workbench Dexie Editor
   workbench-dexie.js
   Load Dexie export, list tables, view/edit rows
   ============================================================================ */

let dexieData = null;
let dexieTables = [];
let currentTable = null;
let currentRowIndex = null;

/* ---------------------------------------------------------
   Load Dexie Export (JSON or JSON.gz)
--------------------------------------------------------- */

async function loadDexieExportFile(file) {
    const name = file.name;
    updateTopBarFileName(name);

    const buffer = await file.arrayBuffer();
    let jsonText;

    if (name.endsWith(".gz")) {
        jsonText = pako.ungzip(new Uint8Array(buffer), { to: "string" });
    } else {
        jsonText = new TextDecoder().decode(buffer);
    }

    dexieData = JSON.parse(jsonText);
    dexieTables = dexieData.data.data;  // Perchance Dexie export structure

    populateDexieTableList();
}

/* ---------------------------------------------------------
   Populate left nav with table names
--------------------------------------------------------- */

function populateDexieTableList() {
    const list = document.getElementById("dexieTableList");
    list.innerHTML = "";

    dexieTables.forEach((table, index) => {
        const div = document.createElement("div");
        div.className = "asset-item";
        div.textContent = table.tableName;

        div.onclick = () => selectDexieTable(index);

        list.appendChild(div);
    });
}

/* ---------------------------------------------------------
   Select a table
--------------------------------------------------------- */

function selectDexieTable(index) {
    currentTable = dexieTables[index];
    currentRowIndex = null;

    populateDexieRows();
}

/* ---------------------------------------------------------
   Populate workspace with rows
--------------------------------------------------------- */

function populateDexieRows() {
    const ws = document.getElementById("dexieWorkspace");

    if (!currentTable) {
        ws.innerHTML = "<p>No table selected.</p>";
        return;
    }

    let html = `<h3>${currentTable.tableName}</h3>`;

    html += `<table class="table">`;
    html += `<tr><th>#</th><th>Preview</th></tr>`;

    currentTable.rows.forEach((row, i) => {
        html += `
            <tr onclick="selectDexieRow(${i})">
                <td>${i}</td>
                <td>${JSON.stringify(row).slice(0, 80)}...</td>
            </tr>
        `;
    });

    html += `</table>`;

    html += `
        <div class="panel">
            <div class="panel-header">Row JSON</div>
            <textarea id="dexieRowJson"></textarea>
            <button class="button mt-10" onclick="applyDexieRowEdit()">Apply Edit</button>
        </div>
    `;

    ws.innerHTML = html;
}

/* ---------------------------------------------------------
   Select a row
--------------------------------------------------------- */

function selectDexieRow(index) {
    currentRowIndex = index;

    const row = currentTable.rows[index];
    const textarea = document.getElementById("dexieRowJson");

    textarea.value = JSON.stringify(row, null, 2);
}

/* ---------------------------------------------------------
   Apply edited JSON back into Dexie structure
--------------------------------------------------------- */

function applyDexieRowEdit() {
    if (currentRowIndex === null) return;

    const textarea = document.getElementById("dexieRowJson");
    try {
        const newRow = JSON.parse(textarea.value);
        currentTable.rows[currentRowIndex] = newRow;
        populateDexieRows();
    } catch (e) {
        alert("Invalid JSON");
    }
}

/* ---------------------------------------------------------
   Export modified Dexie JSON
--------------------------------------------------------- */

function exportDexieJson() {
    const json = JSON.stringify(dexieData, null, 2);
    const blob = new Blob([json], { type: "application/json" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modified-dexie-export.json";
    a.click();
}
