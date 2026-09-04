/* ============================================================================
   SmarHamr Dexie Validator
   Structural + Semantic + Orphaned Reference Detection
   ============================================================================ */

window.DexieValidator = (() => {

    /* ---------------------------------------------------------
       Required Perchance Tables
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
       Expected Fields (semantic validation)
    --------------------------------------------------------- */
    const EXPECTED_FIELDS = {
        characters: {
            name: "string",
            roleInstruction: "string",
            generalWritingInstructions: "string",
            initialMessages: "array",
            shortcutButtons: "array",
            avatar: "object",
            scene: "object",
            customData: "object"
        },
        threads: {
            name: "string",
            characterId: "number",
            userMessagesSentHistory: "array",
            shortcutButtons: "array",
            customData: "object"
        },
        messages: {
            threadId: "number",
            characterId: "number",
            message: "string",
            customData: "object"
        }
    };

    /* ---------------------------------------------------------
       Renamed / Deprecated Fields
       (semantic + orphan detection)
    --------------------------------------------------------- */
    const RENAMED_FIELDS = {
        characterName: "name",
        metaTitle: "customData.metaTitle",
        metaDescription: "customData.metaDescription",
        sceneBackground: "scene.background.url",
        threadMessages: null // deprecated
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
       Utility: get table by name
    --------------------------------------------------------- */
    function getTable(exportJson, name) {
        return exportJson?.data?.data?.find(t => t.tableName === name) || null;
    }

    /* ---------------------------------------------------------
       Structural Validation
    --------------------------------------------------------- */
    function validateStructural(exportJson) {
        const errors = [];

        if (!exportJson || exportJson.formatName !== "dexie" || exportJson.formatVersion !== 1) {
            errors.push("Invalid format: must be Dexie v1");
        }

        const db = exportJson?.data;
        if (!db ||
            db.databaseName !== "chatbot-ui-v1" ||
            db.databaseVersion !== 90) {
            errors.push("Invalid database metadata");
        }

        const tablesMeta = db?.tables || [];
        const tablesData = db?.data || [];

        for (const name of REQUIRED_TABLES) {
            const meta = tablesMeta.find(t => t.name === name);
            const data = tablesData.find(t => t.tableName === name);

            if (!meta || !data) {
                errors.push(`Missing required table: ${name}`);
                continue;
            }

            if (!data.inbound) {
                errors.push(`Table ${name} must have inbound: true`);
            }

            if (typeof meta.rowCount === "number" &&
                Array.isArray(data.rows) &&
                meta.rowCount !== data.rows.length) {
                errors.push(`rowCount mismatch in table: ${name}`);
            }
        }

        return errors;
    }

    /* ---------------------------------------------------------
       Semantic Validation
    --------------------------------------------------------- */
    function validateSemantic(exportJson) {
        const warnings = [];

        const tables = exportJson?.data?.data || [];

        for (const table of tables) {
            const tableName = table.tableName;
            const expected = EXPECTED_FIELDS[tableName];

            if (!expected) continue;

            for (const row of table.rows) {
                // Missing fields
                for (const field in expected) {
                    if (!row.hasOwnProperty(field)) {
                        warnings.push({
                            type: "missingField",
                            table: tableName,
                            rowId: row.id,
                            field
                        });
                    }
                }

                // Type mismatches
                for (const field in expected) {
                    const expectedType = expected[field];
                    const actualType = Array.isArray(row[field]) ? "array" : typeof row[field];

                    if (actualType !== expectedType) {
                        warnings.push({
                            type: "typeMismatch",
                            table: tableName,
                            rowId: row.id,
                            field,
                            expected: expectedType,
                            actual: actualType
                        });
                    }
                }

                // Renamed / deprecated fields
                for (const oldField in RENAMED_FIELDS) {
                    if (row.hasOwnProperty(oldField)) {
                        warnings.push({
                            type: "renamedOrDeprecated",
                            table: tableName,
                            rowId: row.id,
                            oldField,
                            newField: RENAMED_FIELDS[oldField]
                        });
                    }
                }
            }
        }

        return warnings;
    }

    /* ---------------------------------------------------------
       Logic Engine Orphan Detection
    --------------------------------------------------------- */
    function validateLogicEngine(exportJson) {
        const warnings = [];

        const miscTable = getTable(exportJson, "misc");
        if (!miscTable) return warnings;

        const userRole = miscTable.rows.find(r => r.key === "userRoleInstruction");
        if (!userRole || typeof userRole.value !== "string") return warnings;

        let parsed;
        try {
            parsed = JSON.parse(userRole.value);
        } catch {
            return warnings; // not JSON, skip
        }

        for (const key in LOGIC_ENGINE_ORPHANS) {
            if (parsed.hasOwnProperty(key)) {
                warnings.push({
                    type: "logicEngineOrphan",
                    reference: key,
                    mappedTo: LOGIC_ENGINE_ORPHANS[key]
                });
            }
        }

        return warnings;
    }

    /* ---------------------------------------------------------
       Unified Validation Report
    --------------------------------------------------------- */
    function validate(exportJson) {
        return {
            structuralErrors: validateStructural(exportJson),
            semanticWarnings: validateSemantic(exportJson),
            logicEngineWarnings: validateLogicEngine(exportJson)
        };
    }

    /* ---------------------------------------------------------
       Public API
    --------------------------------------------------------- */
    return {
        validate,
        validateStructural,
        validateSemantic,
        validateLogicEngine
    };

})();
