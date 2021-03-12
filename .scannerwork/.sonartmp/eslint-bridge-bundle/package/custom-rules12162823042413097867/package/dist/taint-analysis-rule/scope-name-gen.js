"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUcfgIdSavingScopeNameGen = void 0;
const utils_1 = require("../utils");
/**
 * Constructs a `UcfgIdSavingScopeNameGen` from name generator for UCFGs and a name generator
 * for scopes.
 */
function createUcfgIdSavingScopeNameGen(ucfgIdGen, scopeIdGen) {
    /**
     * A mapping from nodes to scope-IDs, which is incrementally
     * built during the lexical environment analysis phase, and
     * then read during the AST-to-UCFG conversion phase.
     */
    const nodeToIdMapping = new Map();
    return {
        /**
         * The fresh-id generator invoked by block-scope-like scopes during
         * the lexical environment analysis.
         */
        freshIneffectiveScopeId() {
            return scopeIdGen.freshId();
        },
        /**
         * The fresh-id generator invoked by ucfg-generating scopes during
         * the lexical environment analysis.
         */
        freshEffectiveScopeId(node) {
            const abbreviatedNodeType = utils_1.shortenNodeType(node.type);
            const humanReadableName = utils_1.extractHumanReadableName(node);
            const separator = humanReadableName.length > 0 ? '_' : '';
            const res = utils_1.sanitizeWithUnderscores(`${abbreviatedNodeType}${ucfgIdGen.freshId()}${separator}${humanReadableName}`);
            nodeToIdMapping.set(node, res);
            return res;
        },
        /**
         * Retrieves the (presumably already generated) id for an UCFG-generated
         * node during the AST-to-UCFG rewriting phase.
         *
         * @param node ucfg-generating node.
         */
        getUcfgId(node) {
            const maybeId = nodeToIdMapping.get(node);
            /* istanbul ignore else */
            if (maybeId) {
                return maybeId;
            }
            else {
                // 1. Does not occur: ESLint's scope-traversal reliably finds all the nodes
                //                    that generate UCFGs, so all such nodes end up in the cache.
                // 2. If not: then we just generate a new ID which is not tied to a scope. It
                //            might be a bit harder to read, but otherwise inconsequential.
                return this.freshEffectiveScopeId(node);
            }
        },
    };
}
exports.createUcfgIdSavingScopeNameGen = createUcfgIdSavingScopeNameGen;
//# sourceMappingURL=scope-name-gen.js.map