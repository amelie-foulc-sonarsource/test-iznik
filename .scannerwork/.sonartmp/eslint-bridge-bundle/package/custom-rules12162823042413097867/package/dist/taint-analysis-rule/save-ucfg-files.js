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
exports.ScannerworkDir = void 0;
const tmp_1 = __importDefault(require("tmp"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
/**
 * Creates and caches a directory that corresponds to `.scannerwork`-directory
 * (which in turn contains subdirectories with the UCFGs).
 */
class ScannerworkDir {
    constructor(options) {
        this.options = options;
        this.emitPath = undefined;
    }
    /**
     * Converts UCFG identifier into a file path for the file in which the UCFG should
     * be saved.
     */
    ucfgFilePath(id) {
        const dirPath = this.emitDirPath(this.options);
        return path_1.default.join(dirPath, `${utils_1.enforceMaxLength(utils_1.sanitizeWithUnderscores(id))}.ucfg`);
    }
    /** Unconditionally sets up a temporary directory and returns its path. */
    tmpEmitDirPath() {
        const fileResult = tmp_1.default.dirSync();
        const newPath = path_1.default.join(fileResult.name, 'scannerdata', 'ucfg', 'js');
        mkdirp_1.default.sync(newPath);
        this.emitPath = newPath;
        return this.emitPath;
    }
    /**
     * If not already done, attempts to set up the emit directory at user-specified location.
     */
    userDefinedEmitPath(options) {
        if (!this.emitPath) {
            if (!options.emitPath) {
                return undefined;
            }
            const newPath = options.emitPath;
            try {
                mkdirp_1.default.sync(newPath);
                this.emitPath = newPath;
            }
            catch (mkdirpError) {
                return undefined;
            }
        }
        return this.emitPath;
    }
    /**
     * Attempts to set up a directory for the UCFG-files at the user-specified
     * location. If that fails, then it attempts to create a temporary directory
     * instead.
     */
    emitDirPath(options) {
        return this.userDefinedEmitPath(options) || this.tmpEmitDirPath();
    }
}
exports.ScannerworkDir = ScannerworkDir;
//# sourceMappingURL=save-ucfg-files.js.map