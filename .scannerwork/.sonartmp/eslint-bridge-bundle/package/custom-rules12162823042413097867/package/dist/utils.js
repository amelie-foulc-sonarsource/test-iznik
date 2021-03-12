"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminateProblematicCodeUnits = exports.sanitizeWithUnderscores = exports.enforceMaxLength = exports.extractNeatUcfgLocation = exports.shortenedParams = exports.shortenName = exports.extractHumanReadableName = exports.shortenNodeType = exports.ensureDefinedOrElse = exports.ensureNonEmptyOrElseAdd = exports.peek = exports.assertIsDefinedNonNull = void 0;
function assertIsDefinedNonNull(t, assumption) {
    if (t) {
        return t;
    }
    else {
        throw new Error(`Assertion failed: the assumption '${assumption}' was violated.`);
    }
}
exports.assertIsDefinedNonNull = assertIsDefinedNonNull;
function peek(arr) {
    return arr[arr.length - 1];
}
exports.peek = peek;
/**
 * Ensures that the array is not empty.
 *
 * Inserts the value provided by the supplier if it needs to be.
 * Returns the same (but modified) array.
 */
function ensureNonEmptyOrElseAdd(arr, valueToAddSupplier) {
    if (arr.length === 0) {
        arr.push(valueToAddSupplier());
    }
    return arr;
}
exports.ensureNonEmptyOrElseAdd = ensureNonEmptyOrElseAdd;
/**
 * Eager equivalent of `||`, which unconditionally computes the fallback value.
 * @param a
 * @param fallback
 */
function ensureDefinedOrElse(a, fallback) {
    return a || fallback;
}
exports.ensureDefinedOrElse = ensureDefinedOrElse;
/**
 * Shortens the node type.
 */
function shortenNodeType(nodeType) {
    switch (nodeType) {
        case 'FunctionExpression':
            return 'FE';
        case 'FunctionDeclaration':
            return 'FD';
        case 'ArrowFunctionExpression':
            return 'A';
        case 'Program':
            return 'P';
    }
    return nodeType.replace(/[a-z]+/g, '');
}
exports.shortenNodeType = shortenNodeType;
/** A human readable name suitable to be used in UCFG ids. */
function extractHumanReadableName(node) {
    if (node.type === 'FunctionDeclaration') {
        if (node.id) {
            return node.id.name;
        }
        else {
            return '';
        }
    }
    else if (node.type === 'FunctionExpression') {
        if (node.id) {
            return node.id.name;
        }
        else {
            return shortenedParams(node.params);
        }
    }
    else if (node.type === 'ArrowFunctionExpression') {
        return shortenedParams(node.params);
    }
    else if (node.type === 'Program') {
        // Intentionally left empty.
        // The file and the node type are already included in UCFG name.
        return '';
    }
    else {
        return '';
    }
}
exports.extractHumanReadableName = extractHumanReadableName;
const SHORTENED_PARAM_NAME_LEN = 3;
function shortenName(n) {
    return n.slice(0, SHORTENED_PARAM_NAME_LEN);
}
exports.shortenName = shortenName;
function shortenedParams(ps) {
    if (ps.length === 0) {
        return '0';
    }
    else {
        return ps.map(p => shortenName(p.type === 'Identifier' ? p.name : 'Ptrn')).join('-');
    }
}
exports.shortenedParams = shortenedParams;
function extractNeatUcfgLocation(node) {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        if (node.id) {
            return node.id.loc;
        }
        else {
            const fLoc = node.loc;
            const bodyLoc = node.body.loc;
            /* istanbul ignore else */
            if (fLoc && bodyLoc) {
                return {
                    source: fLoc.source,
                    start: fLoc.start,
                    end: bodyLoc.start,
                };
            }
            else {
                // 1. Practically does not happen: never saw an arrow-expr node without a location
                // 2. Irrelevant: if it happens, we lose one location, not critical.
                return undefined;
            }
        }
    }
    else {
        // Arrow function expr
        const arrLoc = node.loc;
        const bodyLoc = node.body.loc;
        /* istanbul ignore else */
        if (arrLoc && bodyLoc) {
            return {
                source: arrLoc.source,
                start: arrLoc.start,
                end: bodyLoc.start,
            };
        }
        else {
            // 1. Practically does not happen: never saw an arrow-expr node without a location
            // 2. Irrelevant: if it happens, we lose one location, not critical.
            return undefined;
        }
    }
}
exports.extractNeatUcfgLocation = extractNeatUcfgLocation;
const DEFAULT_MAX_LENGTH = 200;
/**
 * Ensures that the string is at most `n` characters long,
 * drops the prefix, if necessary.
 *
 * If no value is passed for `n`, the default length of 200 is ensured.
 */
function enforceMaxLength(name, n) {
    const len = typeof n === 'number' && n > 0 ? n : DEFAULT_MAX_LENGTH;
    if (name.length > len) {
        const tooMuchLength = name.length - len;
        return name.slice(tooMuchLength);
    }
    return name;
}
exports.enforceMaxLength = enforceMaxLength;
/**
 * Replaces everything that is not a plain ASCII alphanumeric character
 * with underscores.
 */
function sanitizeWithUnderscores(s) {
    return s.replace(/[^a-zA-Z0-9_]/g, '_');
}
exports.sanitizeWithUnderscores = sanitizeWithUnderscores;
/**
 * Eliminates all UTF-16 surrogate code units.
 */
function eliminateProblematicCodeUnits(s) {
    return s.replace(/[\uD800-\uDFFF]/g, '');
}
exports.eliminateProblematicCodeUnits = eliminateProblematicCodeUnits;
//# sourceMappingURL=utils.js.map