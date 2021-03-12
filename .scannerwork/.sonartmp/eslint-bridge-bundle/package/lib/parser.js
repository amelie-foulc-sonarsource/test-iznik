"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExceptionCodeOf = exports.ParseExceptionCode = exports.parse = exports.parseVueSourceFile = exports.unloadTypeScriptEslint = exports.parseTypeScriptSourceFile = exports.parseJavaScriptSourceFile = exports.PARSER_CONFIG_SCRIPT = exports.PARSER_CONFIG_MODULE = void 0;
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
const babel = __importStar(require("babel-eslint"));
const eslint_1 = require("eslint");
const VueJS = __importStar(require("vue-eslint-parser"));
const tsParser = __importStar(require("@typescript-eslint/parser"));
const context_1 = require("./context");
exports.PARSER_CONFIG_MODULE = {
    tokens: true,
    comment: true,
    loc: true,
    range: true,
    ecmaVersion: 2018,
    sourceType: 'module',
    codeFrame: false,
    ecmaFeatures: {
        jsx: true,
        globalReturn: false,
        legacyDecorators: true,
    },
};
// 'script' source type forces not strict
exports.PARSER_CONFIG_SCRIPT = {
    ...exports.PARSER_CONFIG_MODULE,
    sourceType: 'script',
};
function parseJavaScriptSourceFile(fileContent, filePath, tsConfigs) {
    const context = context_1.getContext();
    const shouldUseTypeScriptParserForJS = context ? context.shouldUseTypeScriptParserForJS : true;
    if (shouldUseTypeScriptParserForJS) {
        const parsed = parseTypeScriptSourceFile(fileContent, filePath, tsConfigs);
        if (parsed instanceof eslint_1.SourceCode) {
            return parsed;
        }
        console.log(`DEBUG Failed to parse ${filePath} with TypeScript compiler: ${parsed.message}`);
    }
    let exceptionToReport = null;
    for (const config of [exports.PARSER_CONFIG_MODULE, exports.PARSER_CONFIG_SCRIPT]) {
        const result = parse(babel.parseForESLint, config, fileContent);
        if (result instanceof eslint_1.SourceCode) {
            return result;
        }
        else if (!exceptionToReport) {
            exceptionToReport = result;
        }
    }
    // if we reach this point, we are sure that "exceptionToReport" is defined
    return {
        line: exceptionToReport.lineNumber,
        message: exceptionToReport.message,
        code: ParseExceptionCode.Parsing,
    };
}
exports.parseJavaScriptSourceFile = parseJavaScriptSourceFile;
function parseTypeScriptSourceFile(fileContent, filePath, tsConfigs) {
    try {
        const result = tsParser.parseForESLint(fileContent, {
            ...exports.PARSER_CONFIG_MODULE,
            filePath,
            project: tsConfigs,
        });
        return new eslint_1.SourceCode({
            ...result,
            parserServices: result.services,
            text: fileContent,
        });
    }
    catch (exception) {
        return {
            line: exception.lineNumber,
            message: exception.message,
            code: parseExceptionCodeOf(exception.message),
        };
    }
}
exports.parseTypeScriptSourceFile = parseTypeScriptSourceFile;
function unloadTypeScriptEslint() {
    tsParser.clearCaches();
}
exports.unloadTypeScriptEslint = unloadTypeScriptEslint;
function parseVueSourceFile(fileContent, filePath, tsConfigs) {
    let exception = null;
    const parsers = ['@typescript-eslint/parser', 'babel-eslint'];
    for (const parser of parsers) {
        try {
            const result = VueJS.parseForESLint(fileContent, {
                filePath,
                parser,
                project: tsConfigs,
                extraFileExtensions: ['.vue'],
                ...exports.PARSER_CONFIG_MODULE,
            });
            return new eslint_1.SourceCode({
                ...result,
                parserServices: result.services,
                text: fileContent,
            });
        }
        catch (err) {
            exception = err;
        }
    }
    return {
        line: exception.lineNumber,
        message: exception.message,
        code: parseExceptionCodeOf(exception.message),
    };
}
exports.parseVueSourceFile = parseVueSourceFile;
function parse(parse, config, fileContent) {
    try {
        const result = parse(fileContent, config);
        if (result.ast) {
            return new eslint_1.SourceCode({ text: fileContent, ...result });
        }
        else {
            return new eslint_1.SourceCode(fileContent, result);
        }
    }
    catch (exception) {
        return exception;
    }
}
exports.parse = parse;
var ParseExceptionCode;
(function (ParseExceptionCode) {
    ParseExceptionCode["Parsing"] = "PARSING";
    ParseExceptionCode["MissingTypeScript"] = "MISSING_TYPESCRIPT";
    ParseExceptionCode["UnsupportedTypeScript"] = "UNSUPPORTED_TYPESCRIPT";
    ParseExceptionCode["FailingTypeScript"] = "FAILING_TYPESCRIPT";
    ParseExceptionCode["GeneralError"] = "GENERAL_ERROR";
})(ParseExceptionCode = exports.ParseExceptionCode || (exports.ParseExceptionCode = {}));
// exported for testing
function parseExceptionCodeOf(exceptionMsg) {
    if (exceptionMsg.startsWith("Cannot find module 'typescript'")) {
        return ParseExceptionCode.MissingTypeScript;
    }
    else if (exceptionMsg.startsWith('You are using version of TypeScript')) {
        return ParseExceptionCode.UnsupportedTypeScript;
    }
    else if (exceptionMsg.startsWith('Debug Failure')) {
        return ParseExceptionCode.FailingTypeScript;
    }
    else {
        return ParseExceptionCode.Parsing;
    }
}
exports.parseExceptionCodeOf = parseExceptionCodeOf;
//# sourceMappingURL=parser.js.map