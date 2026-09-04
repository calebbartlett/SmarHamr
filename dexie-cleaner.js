/* ============================================================================
   SmarHamr Dexie Cleaner
   Auto-Fix for Structural + Semantic + Orphaned Reference Issues
   ============================================================================ */

window.DexieCleaner = (() => {

    /* ---------------------------------------------------------
       Renamed / Deprecated Fields
    --------------------------------------------------------- */
    const RENAMED_FIELDS = {
        characterName: "name",
        metaTitle: "customData.metaTitle",
        metaDescription: "customData.metaDescription",
        sceneBackground: "scene.background.url",
        threadMessages: null // deprecated
    };

    /* ---------------------------------------------------------
       Required Fields (defaults)
    --------------------------------------------------------- */
    const REQUIRED_FIELDS = {
        characters: {
            name: "",
            roleInstruction: "",
            generalWritingInstructions: "",
            initialMessages: [],
            shortcutButtons: [],
            avatar: {},
            scene: {},
            customData: {}
        },
        threads: {
            name: "",
            characterId: null,
            userMessagesSentHistory: [],
            shortcutButtons: [],
            customData: {}
        },
        messages: {
            threadId: null,
            characterId: null,
            message: "",
            customData: {}
        }
    };

    /* ---------------------------------------------------------
       Logic Engine Orphan Map
    --------------------------------------------------------- */
    const LOGIC_ENGINE_ORPHANS = {
        "scene.background.url": "customData.scene.backgroundUrl",
        "threadMessages": null,
        "characterName": "name"
    };

    /* ---------------------------------------------------------
       Utility: deep set (for renamed fields)
    --------------------------------------------------------- */
    function deepSet(obj, path, value) {
        const parts = path.split(".");
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i];
            if (!current[p]) current[p] = {};
            current = current[p];
        }

        current[parts[parts.length - 1]] = value;
    }

    /* ---------------------------------------------------------
       Fix renamed + deprecated fields
    --------------------------------------------------------- */
    function fixRenamedFields(row) {
        for (const oldField in RENAMED_FIELDS) {
            if (!row.hasOwnProperty(oldField)) continue;

            const newField = RENAMED_FIELDS[oldField];

            if (newField === null) {
                delete row[oldField]; // deprecated
            } else {
                deepSet(row, newField, row[oldField]);
                delete row[oldField];
            }
        }
    }

    /* ---------------------------------------------------------
       Fix missing required fields
    --------------------------------------------------------- */
    function fixMissingFields(tableName, row) {
        const required = REQUIRED_FIELDS[tableName];
        if (!required) return;

        for (const field in required) {
            if (!row.hasOwnProperty(field)) {
                row[field] = required[field];
            }
        }
    }

    /* ---------------------------------------------------------
       Fix type mismatches
    --------------------------------------------------------- */
    function fixTypeMismatches(tableName, row) {
        const required = REQUIRED_FIELDS[tableName];
        if (!required) return;

        for (const field in required) {
            const expectedType = typeof required[field];
            const actualType = Array.isArray(row[field]) ? "array" : typeof row[field];

            if (actualType !== expectedType) {
                row[field] = required[field];
            }
        }
    }

    /* ---------------------------------------------------------
       Fix broken thread/character/message links
    --------------------------------------------------------- */
    function fixBrokenLinks(exportJson) {
        const characters = exportJson.data.data.find(t => t.tableName === "characters")?.rows || [];
        const threads = exportJson.data.data.find(t => t.tableName === "threads")?.rows || [];
        const messages = exportJson.data.data.find(t => t.tableName === "messages")?.rows || [];

        const charIds = new Set(characters.map(c => c.id));
        const threadIds = new Set(threads.map(t => t.id));

        // Fix thread.characterId
        for (const thread of threads) {
            if (!charIds.has(thread.characterId)) {
                thread.characterId = characters[0]?.id ?? null;
            }
        }

        // Fix message.threadId + message.characterId
        for (const msg of messages) {
            if (!threadIds.has(msg.threadId)) {
                msg.threadId = threads[0]?.id ?? null;
            }
            if (!charIds.has(msg.characterId)) {
                msg.characterId = characters[0]?.id ?? null;
            }
        }
    }

    /* ---------------------------------------------------------
       Fix orphaned logic engine references
    --------------------------------------------------------- */
    function fixLogicEngine(exportJson) {
        const miscTable = exportJson.data.data.find(t => t.tableName === "misc");
        if (!miscTable) return;

        const userRole = miscTable.rows.find(r => r.key === "userRoleInstruction");
        if (!userRole || typeof userRole.value !== "string") return;

        let parsed;
        try {
            parsed = JSON.parse(userRole.value);
        } catch {
            return; // not JSON
        }

        for (const key in LOGIC_ENGINE_ORPHANS) {
            if (!parsed.hasOwnProperty(key)) continue;

            const newField = LOGIC_ENGINE_ORPHANS[key];

            if (newField === null) {
                delete parsed[key];
            } else {
                deepSet(parsed, newField, parsed[key]);
                delete parsed[key];
            }
        }

        userRole.value = JSON.stringify(parsed, null, 2);
    }

    /* ---------------------------------------------------------
       Fix-All Orchestrator
    --------------------------------------------------------- */
    function fixAll(exportJson) {
        const tables = exportJson.data.data;

        for (const table of tables) {
            const tableName = table.tableName;

            for (const row of table.rows) {
                fixRenamedFields(row);
                fixMissingFields(tableName, row);
                fixTypeMismatches(tableName, row);
            }
        }

        fixBrokenLinks(exportJson);
        fixLogicEngine(exportJson);

        // Sync rowCounts after modifications
        const metaTables = exportJson.data.tables;
        for (const meta of metaTables) {
            const data = tables.find(t => t.tableName === meta.name);
            if (data) meta.rowCount = data.rows.length;
        }

        return exportJson;
    }

    /* ---------------------------------------------------------
       Public API
    --------------------------------------------------------- */
    return {
        fixAll,
        fixRenamedFields,
        fixMissingFields,
        fixTypeMismatches,
        fixBrokenLinks,
        fixLogicEngine
    };

})();
