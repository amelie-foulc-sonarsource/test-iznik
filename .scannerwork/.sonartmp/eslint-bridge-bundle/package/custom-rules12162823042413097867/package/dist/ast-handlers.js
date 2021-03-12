"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultToExpression = exports.resultsToExpressions = exports.onExit = exports.missingImplementationHandler = exports.defaultHandler = exports.extractResultForNodes = exports.extractResultForNode = exports.undefinedResult = exports.variableDeclarationResult = exports.variableDeclaratorResult = exports.propertyResult = exports.propertyPatternResult = exports.objectPatternResult = exports.functionExpressionResult = exports.memberExpressionResult = exports.importDefaultSpecifierResult = exports.importNamespaceSpecifierResult = exports.importSpecifierResult = exports.identifierResult = exports.exportSpecifierResult = exports.expressionResult = exports.classExpressionResult = void 0;
const ucfg_builders_1 = require("./ucfg-builders");
function classExpressionResult(classValueVbl, className) {
    return {
        type: 'classExpression',
        classValueVbl,
        name: className,
    };
}
exports.classExpressionResult = classExpressionResult;
/**
 * Factory method for `AstElementTraversalResult`s that wrap an expression.
 */
function expressionResult(expression) {
    return { type: 'expression', expression };
}
exports.expressionResult = expressionResult;
function exportSpecifierResult(localName, exportedName, localExpr) {
    return {
        type: 'ExportSpecifier',
        localName,
        exportedName,
        localExpr,
    };
}
exports.exportSpecifierResult = exportSpecifierResult;
/**
 * Factory method for `AstElementTraversalResult`s that wrap an identifier.
 *
 * @param name the original name of the identifier (for properties)
 * @param lValue identifier interpreted as a readable/writable variable reference
 */
function identifierResult(name, lValue) {
    return { type: 'identifier', name, lValue };
}
exports.identifierResult = identifierResult;
function importSpecifierResult(local, imported) {
    return {
        type: 'ImportSpecifier',
        local,
        imported,
    };
}
exports.importSpecifierResult = importSpecifierResult;
function importNamespaceSpecifierResult(local) {
    return {
        type: 'ImportNamespaceSpecifier',
        local,
    };
}
exports.importNamespaceSpecifierResult = importNamespaceSpecifierResult;
function importDefaultSpecifierResult(local) {
    return {
        type: 'ImportDefaultSpecifier',
        local,
    };
}
exports.importDefaultSpecifierResult = importDefaultSpecifierResult;
/**
 * Factory method for the
 * "property fetch" = "member expression" = "member access" results,
 * like `a['b']` or `a.b`.
 */
// There are two gotchas with `a.b`-expressions, one simple, and one complicated.
//
// The first gotcha is that the `b` in `a.b` is represented by `Identifier`.
// The expressions like `a.b` are supposed to be treated as `a['b']`, i.e.
// the `b` identifier must be converted into string, to differentiate it
// from `a[b]` where `b` is a variable.
//
// The second gotcha is more subtle.
// The problem is that `o.m` is not actually a subexpression of `o.m(x)`, as one
// can easily see by comparing the output of
// `var a = 58; var o = { a: 42, b() { return this.a; } }; o.b()` vs.
// `var a = 58; var o = { a: 42, b() { return this.a; } }; var e = o.b; e()`.
// The example shows that `o.b` cannot be extracted into a subexpression.
// This happens because extracting `o.b` as subexpression changes the
// implicit `this`.
// In the first case, the implicit `this` is `o`, whereas in the second
// case it is the ambient context.
//
// This is the reason why `fieldAccess`-results are more complicated than
// ordinary expressions: they have to return the implicit `this`.
//
// Furthermore, since `MemberExpression`s are frequently used for method calls,
// and `dcall`s require UCFG-variables in function-value position, we return
// the value stored in a UCFG-variable.
function memberExpressionResult(emitFetch, emitWrite) {
    return {
        type: 'memberExpression',
        emitFetch,
        emitWrite,
    };
}
exports.memberExpressionResult = memberExpressionResult;
function functionExpressionResult(ucfgId, functionValueVbl, name) {
    return {
        type: 'functionExpression',
        ucfgId,
        functionValueVbl,
        name,
    };
}
exports.functionExpressionResult = functionExpressionResult;
function objectPatternResult(properties) {
    return { type: 'objectPattern', properties };
}
exports.objectPatternResult = objectPatternResult;
function propertyPatternResult(key, pattern) {
    return { type: 'propertyPattern', key, pattern };
}
exports.propertyPatternResult = propertyPatternResult;
function propertyResult(key, value) {
    return { type: 'Property', key, value };
}
exports.propertyResult = propertyResult;
/**
 * Factory method for `VariableDeclaratorTraversalResult`s.
 *
 * Invocations should provide an `exportableName` in cases where the left hand side is not a pattern.
 */
function variableDeclaratorResult(value, exportableName) {
    return { type: 'VariableDeclarator', exportableName, value };
}
exports.variableDeclaratorResult = variableDeclaratorResult;
/**
 * Factory method for `VariableDeclarationTraversalResult`s
 *
 * Filters and stores only those declarators that have a definite name.
 */
function variableDeclarationResult(exportableDeclarators) {
    return {
        type: 'VariableDeclaration',
        exportableDeclarators: exportableDeclarators
            .filter(d => d.exportableName)
            .map(d => d),
    };
}
exports.variableDeclarationResult = variableDeclarationResult;
/**
 * Factory method for `AstElementTraversalResult`s that are `undefined`.
 *
 * Special result that corresponds to an `undefined` value.
 * Used either where no result is expected / needed, or to signal that
 * a handler was not implemented (and the default `undefinedHandler` has been
 * used instead).
 */
function undefinedResult() {
    return { type: 'undefined' };
}
exports.undefinedResult = undefinedResult;
function extractResultForNode(results, node) {
    return results.get(node) || undefinedResult();
}
exports.extractResultForNode = extractResultForNode;
function extractResultForNodes(results, nodes) {
    return nodes.map(n => extractResultForNode(results, n));
}
exports.extractResultForNodes = extractResultForNodes;
/** A default handler that does nothing and always returns `undefined`. */
exports.defaultHandler = (_n, _u, _b) => {
    return () => undefinedResult();
};
/** A warning handler that emits a warning for every unhandled type of AST elements. */
exports.missingImplementationHandler = (node, _u, _b) => {
    console.warn('Entering unhandled node: ', node.type);
    return () => {
        console.warn('Exiting unhandled node: ', node.type);
        return undefinedResult();
    };
};
/**
 * Convenience factory for simple handlers that
 * can do everything on exit,
 * and don't need to do anything on entry.
 */
function onExit(doAllAtOnceOnExit) {
    return (n, u, b, ctx) => {
        return (crs) => doAllAtOnceOnExit(n, u, b, crs, ctx);
    };
}
exports.onExit = onExit;
/** Converts all child-results to `Expr`s. */
function resultsToExpressions(results) {
    return results.map(resultToExpression);
}
exports.resultsToExpressions = resultsToExpressions;
function resultToExpression(r) {
    switch (r.type) {
        case 'classExpression':
            return r.classValueVbl;
        case 'expression':
            return r.expression;
        case 'functionExpression':
            return r.functionValueVbl;
        case 'identifier':
            return r.lValue;
        case 'memberExpression':
            return r.emitFetch().fetchedValue;
        case 'undefined':
            return ucfg_builders_1._undefined();
        default:
            return ucfg_builders_1.stringLiteral(`<Not an expression: ${r.type}>`);
    }
}
exports.resultToExpression = resultToExpression;
//# sourceMappingURL=ast-handlers.js.map