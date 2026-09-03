/* ============================================================================
   SmarHamr — Dexie Workbench Loader (Simple, Stable, Filename-aware)
   ============================================================================ */

window.smarhamrExport = null;
window.smarhamrCurrentFileName = "No file loaded";

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
        window.smarhamrExport = data;

        localStorage.setItem("smarhamrExport", JSON.stringify(data));
        localStorage.setItem("smarhamrExportFileName", file.name);

        renderDexieWorkspace(data);

    } catch (err) {
        alert("Invalid JSON or JSON.GZ file.");
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
        } catch (err) {
            // ignore invalid JSON while typing
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
            renderDexieWorkspace(window.smarhamrExport);
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
   Build SmarHamr Tutor Bundle (Perchance-accurate, summarizeOld, auto memories)
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
   Insert SmarHamr Tutor (Perchance-compatible)
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

    charactersTable.rowCount = charactersTable.rows.length;
    threadsTable.rowCount = threadsTable.rows.length;
    messagesTable.rowCount = messagesTable.rows.length;

    localStorage.setItem("smarhamrExport", JSON.stringify(window.smarhamrExport));
    renderDexieWorkspace(window.smarhamrExport);

    alert("SmarHamr Tutor inserted successfully.");
}

/* ============================================================================
   Load Clean SmarHamr Profile (Perchance-compatible)
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

    window.smarhamrExport = cleanExport;
    updateCurrentFileName("SmarHamr Clean Profile (in-memory)");

    localStorage.setItem("smarhamrExport", JSON.stringify(cleanExport));
    localStorage.setItem("smarhamrExportFileName", "smarhamr-clean-profile.json");

    renderDexieWorkspace(cleanExport);

    alert("Clean SmarHamr profile loaded.\nExport it to use in Perchance.");
}
