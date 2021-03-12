"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractOptions = exports.OPTIONS_SCHEMA = void 0;
const path_1 = __importDefault(require("path"));
exports.OPTIONS_SCHEMA = {
    emit: {
        type: 'boolean',
    },
    emitPath: {
        type: 'string',
    },
    envMerging: {
        type: 'boolean',
    },
    preamble: {
        type: 'boolean',
    },
};
function extractOptions(context) {
    const defaultOptions = {
        emit: true,
        emitPath: undefined,
        envMerging: true,
        preamble: true,
    };
    const result = defaultOptions;
    if (context.options.length > 0) {
        Object.assign(result, context.options[0]);
        if (context.options[0].workDir) {
            result.emitPath = path_1.default.join(context.options[0].workDir, 'ucfg2', 'js');
        }
    }
    return result;
}
exports.extractOptions = extractOptions;
//# sourceMappingURL=options.js.map