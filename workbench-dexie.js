/* ============================================================================
   SmarHamr — Dexie Workbench Loader (with Live Validation + Status Line + Sync)
   ============================================================================ */

window.smarhamrExport = null;
window.smarhamrCurrentFileName = "No file loaded";

/* ---------------------------------------------------------
   Status Line Update
--------------------------------------------------------- */

function updateDexieStatus(message, isError = false) {
    const el = document.getElementById("dexieStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "#ff6666" : "#88cc88";
}

/* ---------------------------------------------------------
   Canonical Dexie Structure Rules
--------------------------------------------------------- */

const REQUIRED_TABLES = [
    "characters",
    "threads",
    "messages",
    "misc",
    "summaries",
    "memories",
    "lore",
    "textEmbeddingCache",
    "textCompressionCache"
];

/* ---------------------------------------------------------
   Sync rowCount in tables[] with rows.length in data[]
--------------------------------------------------------- */

function syncRowCounts() {
    if (!window.smarhamrExport) return;

    const metaTables = window.smarhamrExport.data.tables;
    const dataTables = window.smarhamrExport.data.data;

    metaTables.forEach(meta => {
        const dataEntry = dataTables.find(d => d.tableName === meta.name);
        if (dataEntry && Array.isArray(dataEntry.rows)) {
            meta.rowCount = dataEntry.rows.length;
        }
    });
}

/* ---------------------------------------------------------
   Dexie Structure Validator
--------------------------------------------------------- */

function validateDexieStructure(exportJson) {
    if (!exportJson ||
        exportJson.formatName !== "dexie" ||
        exportJson.formatVersion !== 1) {
        throw new Error("Invalid format: must be Dexie v1");
    }

    const db = exportJson.data;
    if (!db ||
        db.databaseName !== "chatbot-ui-v1" ||
        db.databaseVersion !== 90) {
        throw new Error("Invalid database metadata");
    }

    const tablesMeta = db.tables || [];
    const tablesData = db.data || [];

    for (const name of REQUIRED_TABLES) {
        const meta = tablesMeta.find(t => t.name === name);
        const data = tablesData.find(t => t.tableName === name);

        if (!meta || !data) {
            throw new Error(`Missing required table: ${name}`);
        }

        if (!data.inbound) {
            throw new Error(`Table ${name} must have inbound: true`);
        }

        if (typeof meta.rowCount === "number" &&
            Array.isArray(data.rows) &&
            meta.rowCount !== data.rows.length) {
            throw new Error(`rowCount mismatch in table: ${name}`);
        }
    }

    return true;
}

function validateDexieStructureSafe(exportJson) {
    try {
        validateDexieStructure(exportJson);
        updateDexieStatus("Dexie Structure: OK");
    } catch (err) {
        updateDexieStatus("Dexie Structure: " + err.message, true);
    }
}

/* ---------------------------------------------------------
   Update filename in top bar
--------------------------------------------------------- */

function updateCurrentFileName(name) {
    window.smarhamrCurrentFileName = name;
    const el = document.getElementById("currentFileName");
    if (el) el.textContent = name;
}

/* ---------------------------------------------------------
   Utility: GZIP decompress + JSON parse
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

/* ---------------------------------------------------------
   Load into workspace
--------------------------------------------------------- */

async function handleFileLoad(file) {
    try {
        const data = await loadFile(file);

        syncRowCounts();             // NEW
        validateDexieStructureSafe(data);

        window.smarhamrExport = data;

        localStorage.setItem("smarhamrExport", JSON.stringify(data));
        localStorage.setItem("smarhamrExportFileName", file.name);

        renderDexieWorkspace(data);

    } catch (err) {
        alert("Invalid Dexie export or structure mismatch.");
        console.error(err);
    }
}

/* ---------------------------------------------------------
   Render full JSON workspace (editable)
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

            syncRowCounts();          // NEW
            validateDexieStructureSafe(updated);

        } catch (err) {
            updateDexieStatus("Dexie Structure: Invalid JSON", true);
        }
    });
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

    syncRowCounts();                  // NEW

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

    const saved = localStorage.getItem("smarhamrExport");
    const savedName = localStorage.getItem("smarhamrExportFileName");

    if (saved) {
        try {
            window.smarhamrExport = JSON.parse(saved);
            updateCurrentFileName(savedName || "No file loaded");
            syncRowCounts();          // NEW
            renderDexieWorkspace(window.smarhamrExport);
            validateDexieStructureSafe(window.smarhamrExport);
        } catch (err) {
            console.warn("Failed to restore saved export:", err);
        }
    }
});

/* ============================================================================
   Persona ID Namespace (333xx)
   ============================================================================ */

function getNextPersonaId() {
    if (!window.smarhamrExport) return 33300;

    const tables = window.smarhamrExport?.data?.data || [];
    const charactersTable = tables.find(t => t.tableName === "characters");
    if (!charactersTable) return 33300;

    const ids = charactersTable.rows
        .map(r => typeof r.id === "number" ? r.id : null)
        .filter(id => id !== null && id >= 33300);

    if (!ids.length) return 33300;
    return Math.max(...ids) + 1;
}

/* ============================================================================
   Build SmarHamr Tutor Bundle
   ============================================================================ */

function buildSmarHamrTutorBundle(personaId) {
    const now = Date.now();

    const characterRow = {
        name: "SmarHamr Tutor",
        roleInstruction: "SmarHamr Tutor helps you understand Perchance exports and the SmarHamr Workbench.",
        maxParagraphCountPerMessage: 0,
        reminderMessage: "",
        generalWritingInstructions: "",
        messageWrapperStyle: "",
        imagePromptPrefix: "",
        imagePromptSuffix: "",
        imagePromptTriggers: "",
        fitMessagesInContextMethod: "summarizeOld",
        autoGenerateMemories: "auto",
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
                content: "Welcome! This export includes the SmarHamr Tutor.\nVisit https://calebbartlett.github.io/SmarHamr/ for documentation."
            }
        ],
        shortcutButtons: [],
        loreBookUrls: [],
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
        message: "This export was modified by SmarHamr Workbench.\nVisit https://calebbartlett.github.io/SmarHamr/ for docs and tools.",
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

/* ============================================================================
   Insert SmarHamr Tutor
   ============================================================================ */

function onInsertSmarHamrTutor() {
    if (!window.smarhamrExport) {
        alert("Load a Dexie export first.");
        return;
    }

    const personaId = getNextPersonaId();
    const { characterRow, threadRow, messageRow } = buildSmarHamrTutorBundle(personaId);

    const tables = window.smarhamrExport.data.data;

    const charactersTable = tables.find(t => t.tableName === "characters");
    const threadsTable = tables.find(t => t.tableName === "threads");
    const messagesTable = tables.find(t => t.tableName === "messages");

    if (!charactersTable || !threadsTable || !messagesTable) {
        alert("This export does not contain Perchance tables.");
        return;
    }

    charactersTable.rows.push(characterRow);
    threadsTable.rows.push(threadRow);
    messagesTable.rows.push(messageRow);

    syncRowCounts();                  // NEW

    localStorage.setItem("smarhamrExport", JSON.stringify(window.smarhamrExport));
    renderDexieWorkspace(window.smarhamrExport);
    validateDexieStructureSafe(window.smarhamrExport);

    alert("SmarHamr Tutor inserted successfully.");
}

/* ============================================================================
   Load Clean SmarHamr Profile
   ============================================================================ */

function onLoadCleanSmarHamrProfile() {
    const personaId = 33300;
    const now = Date.now();
    const { characterRow, threadRow, messageRow } = buildSmarHamrTutorBundle(personaId);

    const cleanExport = {
        formatName: "dexie",
        formatVersion: 1,
        data: {
            databaseName: "chatbot-ui-v1",
            databaseVersion: 90,
            tables: [
                { name: "characters", schema: "++id,modelName,fitMessagesInContextMethod,uuid,creationTime,lastMessageTime,folderPath", rowCount: 1 },
                { name: "threads", schema: "++id,name,characterId,creationTime,lastMessageTime,lastViewTime,folderPath", rowCount: 1 },
                { name: "messages", schema: "++id,threadId,characterId,creationTime,order", rowCount: 1 },
                { name: "misc", schema: "key", rowCount: 4 },
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
                    rows: [
                        { key: "showInlineReminder", value: "no" },
                        { key: "userAvatarUrl", value: "" },
                        { key: "userName", value: "User" },
                        { key: "userRoleInstruction", value: "" }
                    ]
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

    syncRowCounts();                  // NEW

    window.smarhamrExport = cleanExport;
    updateCurrentFileName("SmarHamr Clean Profile (in-memory)");

    localStorage.setItem("smarhamrExport", JSON.stringify(cleanExport));
    localStorage.setItem("smarhamrExportFileName", "smarhamr-clean-profile.json");

    renderDexieWorkspace(cleanExport);
    validateDexieStructureSafe(cleanExport);

    alert("Clean SmarHamr profile loaded.\nExport it to use in Perchance.");
}
