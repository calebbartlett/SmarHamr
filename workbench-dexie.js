/* ============================================================================
   SmarHamr Workbench — Dexie Editor + Advanced Tools
   ============================================================================ */

window.smarhamrExport = null;
window.smarhamrCurrentFileName = "No file loaded";

/* ---------------------------------------------------------
   Topbar filename
--------------------------------------------------------- */
function updateCurrentFileName(name) {
    window.smarhamrCurrentFileName = name || "No file loaded";
    const el = document.getElementById("currentFileName");
    if (el) el.textContent = window.smarhamrCurrentFileName;
}

/* ---------------------------------------------------------
   File loading (JSON / JSON.GZ)
--------------------------------------------------------- */
async function loadFile(file) {
    const isGzip = file.name.endsWith(".gz");
    updateCurrentFileName(file.name);

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

async function handleFileLoad(file) {
    try {
        const data = await loadFile(file);
        window.smarhamrExport = data;

        localStorage.setItem("smarhamrExport", JSON.stringify(data));
        localStorage.setItem("smarhamrExportFileName", file.name);

        populateTableDropdown();
        renderDexieWorkspace(data);
    } catch (err) {
        alert("Invalid JSON or JSON.GZ file.");
        console.error(err);
    }
}

/* ---------------------------------------------------------
   Dexie workspace (full JSON editor)
--------------------------------------------------------- */
function renderDexieWorkspace(data) {
    const editor = document.getElementById("dexieEditor");
    if (!editor) return;

    editor.value = JSON.stringify(data, null, 2);

    editor.addEventListener("input", () => {
        try {
            const updated = JSON.parse(editor.value);
            window.smarhamrExport = updated;
            localStorage.setItem("smarhamrExport", JSON.stringify(updated));
        } catch (err) {
            // ignore while typing
        }
    });
}

/* ---------------------------------------------------------
   Table + row dropdowns
--------------------------------------------------------- */
function getDataTables() {
    return window.smarhamrExport?.data?.data || [];
}

function populateTableDropdown() {
    const tableSelect = document.getElementById("tableSelect");
    if (!tableSelect) return;

    tableSelect.innerHTML = `<option value="">-- Select Table --</option>`;

    const tables = getDataTables();
    tables.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.tableName;
        opt.textContent = `${t.tableName} (${t.rows.length} rows)`;
        tableSelect.appendChild(opt);
    });
}

function onTableSelected() {
    const tableName = document.getElementById("tableSelect").value;
    const rowSelect = document.getElementById("rowSelect");
    if (!rowSelect) return;

    rowSelect.innerHTML = `<option value="">-- Select Row --</option>`;

    if (!tableName) return;

    const table = getDataTables().find(t => t.tableName === tableName);
    if (!table) return;

    table.rows.forEach((row, index) => {
        const opt = document.createElement("option");
        opt.value = index;
        opt.textContent = `Row ${index}`;
        rowSelect.appendChild(opt);
    });
}

function onRowSelected() {
    const tableName = document.getElementById("tableSelect").value;
    const rowIndex = document.getElementById("rowSelect").value;

    if (!tableName || rowIndex === "") return;

    const table = getDataTables().find(t => t.tableName === tableName);
    if (!table) return;

    const row = table.rows[rowIndex];
    const panel = document.getElementById("rowEditorPanel");
    const editor = document.getElementById("rowEditor");

    if (!panel || !editor) return;

    panel.style.display = "block";
    editor.value = JSON.stringify(row, null, 2);

    editor.oninput = () => {
        try {
            const updatedRow = JSON.parse(editor.value);
            table.rows[rowIndex] = updatedRow;
            localStorage.setItem("smarhamrExport", JSON.stringify(window.smarhamrExport));
            renderDexieWorkspace(window.smarhamrExport);
        } catch (err) {
            // ignore invalid JSON while typing
        }
    };
}

/* ---------------------------------------------------------
   Export as GZIP
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

    const filename = `${prefix}.smarhamr.json.gz`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ---------------------------------------------------------
   Persona ID namespace (333xx)
--------------------------------------------------------- */
function getNextPersonaId() {
    const tables = getDataTables();
    const charactersTable = tables.find(t => t.tableName === "characters");
    if (!charactersTable) return 33300;

    const ids = charactersTable.rows
        .map(r => typeof r.id === "number" ? r.id : null)
        .filter(id => id !== null && id >= 33300);

    if (!ids.length) return 33300;
    return Math.max(...ids) + 1;
}

/* ---------------------------------------------------------
   Helpers to get specific tables
--------------------------------------------------------- */
function getTableByName(name) {
    return getDataTables().find(t => t.tableName === name);
}

/* ---------------------------------------------------------
   Generate SmarHamr Tutor row set
--------------------------------------------------------- */
function buildSmarHamrTutorBundle(personaId) {
    const now = Date.now();

    const characterRow = {
        name: "SmarHamr Tutor",
        roleInstruction: "SmarHamr is a tutor persona that helps you understand Perchance exports and the SmarHamr Workbench.",
        maxParagraphCountPerMessage: 0,
        reminderMessage: "",
        generalWritingInstructions: "@roleplay1",
        messageWrapperStyle: "",
        imagePromptPrefix: "",
        imagePromptSuffix: "",
        imagePromptTriggers: "",
        fitMessagesInContextMethod: "summarizeOld",
        autoGenerateMemories: "none",
        customCode: "",
        messageInputPlaceholder: "",
        metaTitle: "",
        metaDescription: "",
        metaImage: "",
        modelName: "perchance-ai",
        temperature: 0.8,
        maxTokensPerMessage: 500,
        textEmbeddingModelName: "Xenova/bge-base-en-v1.5",
        initialMessages: [
            {
                author: "ai",
                content: "Welcome! This Dexie export includes the SmarHamr Tutor.\nVisit https://calebbartlett.github.io/SmarHamr/ to learn more."
            }
        ],
        shortcutButtons: [],
        loreBookUrls: [
            "https://calebbartlett.github.io/SmarHamr/docs/smarhamr_tutor_lore.txt"
        ],
        avatar: { url: "", size: 1, shape: "square" },
        scene: { background: { url: "" }, music: { url: "" } },
        userCharacter: { avatar: {} },
        systemCharacter: { avatar: {} },
        streamingResponse: true,
        folderPath: "",
        customData: {},
        uuid: null,
        creationTime: now,
        lastMessageTime: now,
        id: personaId,
        $types: {
            maxParagraphCountPerMessage: "undef",
            initialMessages: "arrayNonindexKeys",
            shortcutButtons: "arrayNonindexKeys",
            loreBookUrls: "arrayNonindexKeys"
        }
    };

    const threadRow = {
        name: "SmarHamr Tutor Thread",
        characterId: personaId,
        creationTime: now,
        lastMessageTime: now,
        lastViewTime: now,
        isFav: false,
        userCharacter: { avatar: {} },
        systemCharacter: { avatar: {} },
        character: { avatar: {} },
        modelName: "perchance-ai",
        customCodeWindow: { visible: false, width: null },
        customData: {},
        folderPath: "",
        loreBookId: 0,
        textEmbeddingModelName: "Xenova/bge-base-en-v1.5",
        userMessagesSentHistory: [],
        unsentMessageText: "",
        shortcutButtons: [],
        currentSummaryHashChain: [],
        id: personaId,
        $types: {
            userMessagesSentHistory: "arrayNonindexKeys",
            shortcutButtons: "arrayNonindexKeys",
            currentSummaryHashChain: "arrayNonindexKeys"
        }
    };

    const messageRow = {
        threadId: personaId,
        message: "This export was generated or modified by SmarHamr Workbench.\nVisit https://calebbartlett.github.io/SmarHamr/ for documentation and tools.",
        characterId: personaId,
        hiddenFrom: [],
        expectsReply: 0,
        creationTime: now,
        variants: [null],
        memoryIdBatchesUsed: [],
        loreIdsUsed: [],
        summaryHashUsed: null,
        summariesUsed: null,
        summariesEndingHere: null,
        memoriesEndingHere: null,
        memoryQueriesUsed: [],
        messageIdsUsed: [],
        name: null,
        scene: null,
        avatar: {},
        customData: {},
        wrapperStyle: "",
        order: 0,
        instruction: null,
        id: personaId,
        $types: {
            hiddenFrom: "arrayNonindexKeys",
            expectsReply: "undef",
            variants: "arrayNonindexKeys",
            memoryIdBatchesUsed: "arrayNonindexKeys",
            loreIdsUsed: "arrayNonindexKeys",
            memoryQueriesUsed: "arrayNonindexKeys",
            messageIdsUsed: "arrayNonindexKeys"
        }
    };

    return { characterRow, threadRow, messageRow };
}

/* ---------------------------------------------------------
   Advanced Tool: Insert SmarHamr Tutor into current export
--------------------------------------------------------- */
function onInsertSmarHamrTutor() {
    if (!window.smarhamrExport) {
        alert("Load a Perchance Dexie export first.");
        return;
    }

    const confirmInsert = confirm(
        "Insert SmarHamr Tutor into the current export?\n\n" +
        "This adds a new character, thread, and intro message using ID namespace 333xx.\n" +
        "It does NOT overwrite existing data."
    );
    if (!confirmInsert) return;

    const personaId = getNextPersonaId();
    const { characterRow, threadRow, messageRow } = buildSmarHamrTutorBundle(personaId);

    const charactersTable = getTableByName("characters");
    const threadsTable = getTableByName("threads");
    const messagesTable = getTableByName("messages");

    if (!charactersTable || !threadsTable || !messagesTable) {
        alert("This export does not have the expected Perchance tables.");
        return;
    }

    charactersTable.rows.push(characterRow);
    threadsTable.rows.push(threadRow);
    messagesTable.rows.push(messageRow);

    charactersTable.rowCount = charactersTable.rows.length;
    threadsTable.rowCount = threadsTable.rows.length;
    messagesTable.rowCount = messagesTable.rows.length;

    localStorage.setItem("smarhamrExport", JSON.stringify(window.smarhamrExport));
    renderDexieWorkspace(window.smarhamrExport);
    populateTableDropdown();

    alert("SmarHamr Tutor inserted successfully.");
}

/* ---------------------------------------------------------
   Advanced Tool: Load Clean SmarHamr Profile
--------------------------------------------------------- */
function onLoadCleanSmarHamrProfile() {
    const confirmClean = confirm(
        "Load a clean SmarHamr Dexie profile?\n\n" +
        "This replaces the current in-memory export with a minimal Perchance-ready database\n" +
        "containing only the SmarHamr Tutor and its thread.\n\n" +
        "You must export manually if you want to use it in Perchance."
    );
    if (!confirmClean) return;

    const personaId = 33300;
    const { characterRow, threadRow, messageRow } = buildSmarHamrTutorBundle(personaId);

    const cleanExport = {
        formatName: "dexie",
        formatVersion: 1,
        data: {
            databaseName: "chatbot-ui-v1",
            databaseVersion: 1,
            tables: [
                { name: "characters", schema: "++id,modelName,fitMessagesInContextMethod,uuid,creationTime,lastMessageTime,folderPath", rowCount: 1 },
                { name: "threads", schema: "++id,name,characterId,creationTime,lastMessageTime,lastViewTime,folderPath", rowCount: 1 },
                { name: "messages", schema: "++id,threadId,characterId,creationTime,order", rowCount: 1 },
                { name: "misc", schema: "key", rowCount: 0 },
                { name: "summaries", schema: "hash,threadId", rowCount: 0 },
                { name: "memories", schema: "++id,[summaryHash+threadId],[characterId+status],[threadId+status],[threadId+index],threadId", rowCount: 0 },
                { name: "lore", schema: "++id,bookId,bookUrl", rowCount: 0 },
                { name: "textEmbeddingCache", schema: "++id,textHash,&[textHash+modelName]", rowCount: 0 },
                { name: "textCompressionCache", schema: "++id,uncompressedTextHash,&[uncompressedTextHash+modelName+tokenLimit]", rowCount: 0 }
            ],
            data: [
                {
                    tableName: "characters",
                    inbound: true,
                    rows: [characterRow]
                },
                {
                    tableName: "threads",
                    inbound: true,
                    rows: [threadRow]
                },
                {
                    tableName: "messages",
                    inbound: true,
                    rows: [messageRow]
                },
                {
                    tableName: "misc",
                    inbound: true,
                    rows: []
                },
                {
                    tableName: "summaries",
                    inbound: true,
                    rows: []
                },
                {
                    tableName: "memories",
                    inbound: true,
                    rows: []
                },
                {
                    tableName: "lore",
                    inbound: true,
                    rows: []
                },
                {
                    tableName: "textEmbeddingCache",
                    inbound: true,
                    rows: []
                },
                {
                    tableName: "textCompressionCache",
                    inbound: true,
                    rows: []
                }
            ]
        }
    };

    window.smarhamrExport = cleanExport;
    updateCurrentFileName("SmarHamr Clean Profile (in-memory)");
    localStorage.setItem("smarhamrExport", JSON.stringify(cleanExport));
    localStorage.setItem("smarhamrExportFileName", "smarhamr-clean-profile.json");

    renderDexieWorkspace(cleanExport);
    populateTableDropdown();

    alert("Clean SmarHamr profile loaded in memory.\nExport it if you want to use it in Perchance.");
}

/* ---------------------------------------------------------
   Init
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("workbenchFileInput");
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) handleFileLoad(file);
        });
    }

    const saved = localStorage.getItem("smarhamrExport");
    const savedName = localStorage.getItem("smarhamrExportFileName");

    if (saved) {
        try {
            window.smarhamrExport = JSON.parse(saved);
            updateCurrentFileName(savedName || "No file loaded");
            renderDexieWorkspace(window.smarhamrExport);
            populateTableDropdown();
        } catch (err) {
            console.warn("Failed to restore saved export:", err);
        }
    }
});
