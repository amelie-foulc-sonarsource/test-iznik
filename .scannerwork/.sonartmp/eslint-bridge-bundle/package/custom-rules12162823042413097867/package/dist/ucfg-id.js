"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ucfgIdForModule = exports.defaultUcfgId = void 0;
const utils_1 = require("./utils");
/**
 * Generates a default ID's for UCFGs based on current code path and node.
 *
 * These IDs should only be used for things that cannot be named with a
 * global TypeScript name. All other nodes (which can be named by in a TypeScript
 * declaration) should set more appropriate names.
 */
function defaultUcfgId(sourceFile, cwd, node, shortId) {
    var _a;
    const withoutCwd = sourceFile.startsWith(cwd) ? sourceFile.slice(cwd.length) : sourceFile;
    const cleanedFilePath = withoutCwd.replace(/^\/*/, '').replace(/^\\/, '');
    const locationStart = (_a = node.loc) === null || _a === void 0 ? void 0 : _a.start;
    const lineCol = locationStart ? `_${locationStart.line}_${locationStart.column + 1}` : '';
    return utils_1.sanitizeWithUnderscores(`${cleanedFilePath}${lineCol}_${shortId}`);
}
exports.defaultUcfgId = defaultUcfgId;
function ucfgIdForModule(sourceFile) {
    return `${utils_1.sanitizeWithUnderscores(sourceFile)}_1_1_P1-ENTRY`;
}
exports.ucfgIdForModule = ucfgIdForModule;
//# sourceMappingURL=ucfg-id.js.map