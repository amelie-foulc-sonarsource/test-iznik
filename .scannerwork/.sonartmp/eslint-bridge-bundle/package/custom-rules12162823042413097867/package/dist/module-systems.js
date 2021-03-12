"use strict";
/*
 * Copyright (C) 2020-2020 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExportAssignment = exports.handleImportEquals = exports.extractDynamicImportSource = exports.handleDynamicImport = exports.handleImportDeclaration = exports.handleImportDefaultSpecifier = exports.handleImportNamespaceSpecifier = exports.handleImportSpecifier = exports.handleExportAllDeclaration = exports.handleExportSpecifier = exports.handleExportDefaultDeclaration = exports.handleExportNamedDeclaration = exports.importModule = void 0;
const experimental_utils_1 = require("@typescript-eslint/experimental-utils");
const ast_handlers_1 = require("./ast-handlers");
const ucfg_builders_1 = require("./ucfg-builders");
const ucfg_id_1 = require("./ucfg-id");
const utils_1 = require("./utils");
const promises_1 = require("./promises");
const backend = __importStar(require("./backend"));
const EXPORTS = 'exports';
/**
 * Helper method that handles both cases of importing user-defined and stubbed modules.
 *
 * It's supposed to be used with `UcfgBuilder`s `getOrElseUpdateSharedImport`, together
 * these methods ensure that import a module at most once per file, so that it's not
 * duplicated if there are multiple imports / re-exports referring to the same module.
 */
function importModule(ucfgBuilder, blockBuilder, ctx) {
    return (source) => {
        const resolved = ctx.resolveModule(source);
        const importsFragmentBuilder = utils_1.assertIsDefinedNonNull(ucfgBuilder.getFragmentBuilder('shared-imports'), 'All `import`-clauses must all be on top-level of the module; ' +
            'At the top-level, a fragment builder for shared imports is always defined');
        console.log(`DEBUG Resolved '${source}' as '${resolved}'`);
        if (resolved) {
            const ucfgId = ucfg_id_1.ucfgIdForModule(resolved);
            const emptyThisObject = importsFragmentBuilder.newObject('Object');
            return importsFragmentBuilder.call(ucfgId, [emptyThisObject], {});
        }
        else {
            const globalBuiltins = backend.globalContextBuiltins(ucfgBuilder, blockBuilder);
            return importsFragmentBuilder.dynamicCall(ucfg_builders_1.fieldAccess(globalBuiltins, 'require'), [
                ucfg_builders_1._undefined(),
                ucfg_builders_1._undefined(),
                ucfg_builders_1.stringLiteral(source),
            ]);
        }
    };
}
exports.importModule = importModule;
/** Handlers for ES6 `import`/`export` clauses. */
function handleExportNamedDeclaration(node, ucfgBuilder, blockBuilder, childResults, context) {
    const clause = node;
    const decl = clause.declaration;
    if (!decl) {
        if (!clause.source) {
            handleNamedExports(clause, blockBuilder, childResults, node.loc);
        }
        else {
            const source = asImportSource(clause.source.value);
            handleNamedReexports(clause, source, ucfgBuilder, blockBuilder, childResults, context, node.loc);
        }
    }
    else if (decl.type === 'FunctionDeclaration') {
        handleNamedFunctionDeclaration(decl, blockBuilder, childResults, node.loc);
    }
    else if (decl.type === 'ClassDeclaration') {
        handleNamedClassDeclaration(decl, blockBuilder, childResults, node.loc);
    }
    else if (decl.type === 'VariableDeclaration') {
        handleNamedVariableDeclaration(decl, blockBuilder, childResults, node.loc);
    }
    // Can happen: `export type Foo = {};` results in TSTypeAliasTypeDeclaration etc.
    return ast_handlers_1.undefinedResult();
}
exports.handleExportNamedDeclaration = handleExportNamedDeclaration;
function handleNamedExports(clause, blockBuilder, childResults, loc) {
    // It's the `export { x as y }`-case, `x` is referencing some value.
    for (const specifier of clause.specifiers) {
        const specifierResult = ast_handlers_1.extractResultForNode(childResults, specifier);
        blockBuilder.assignExpr(ucfg_builders_1.fieldAccess(EXPORTS, specifierResult.exportedName), specifierResult.localExpr, loc);
    }
}
function handleNamedReexports(clause, source, ucfgBuilder, blockBuilder, childResults, context, loc) {
    // It's the `export { x as y } from 'z'`-case, `x` is just a property name.
    // Note that in re-exports, the `z` is actually treated as if it were yet another
    // import.
    const importedModuleVar = ucfgBuilder.getOrElseUpdateSharedImport(source, importModule(ucfgBuilder, blockBuilder, context));
    for (const specifier of clause.specifiers) {
        const specifierResult = ast_handlers_1.extractResultForNode(childResults, specifier);
        blockBuilder.assignExpr(ucfg_builders_1.fieldAccess(EXPORTS, specifierResult.exportedName), ucfg_builders_1.fieldAccess(importedModuleVar, specifierResult.localName), loc);
    }
}
function handleNamedFunctionDeclaration(decl, blockBuilder, childResults, loc) {
    const { name, functionValueVbl } = ast_handlers_1.extractResultForNode(childResults, decl);
    /* istanbul ignore else */
    if (name) {
        blockBuilder.assignExpr(ucfg_builders_1.fieldAccess(EXPORTS, name), functionValueVbl, loc);
    }
    else {
        // There can be nameless function declarations, but they occur only in `ExportDefaultDeclaration`s
        // 1. Should not occur: nameless function declarations should not occur inside of `ExportNamedDeclaration`s
        // 2. Harmless: the worst thing that can happen is that we omit a declaration.
    }
}
function handleNamedClassDeclaration(decl, blockBuilder, childResults, loc) {
    const { name, classValueVbl } = ast_handlers_1.extractResultForNode(childResults, decl);
    /* istanbul ignore else */
    if (name) {
        blockBuilder.assignExpr(ucfg_builders_1.fieldAccess('exports', name), classValueVbl, loc);
    }
    else {
        // There can be nameless class declarations, but they occur only in `ExportDefaultDeclaration`s
        // 1. Should not occur: nameless class declarations should not occur inside of `ExportNamedDeclaration`s
        // 2. Harmless: the worst thing that can happen is that we omit a declaration.
    }
}
function handleNamedVariableDeclaration(decl, blockBuilder, childResults, loc) {
    const { exportableDeclarators } = ast_handlers_1.extractResultForNode(childResults, decl);
    for (const { exportableName, value } of exportableDeclarators) {
        blockBuilder.assignExpr(ucfg_builders_1.fieldAccess('exports', exportableName), value, loc);
    }
}
function handleExportDefaultDeclaration(node, _ucfgBuilder, blockBuilder, childResults, _context) {
    const exportDefaultDecl = node;
    const resultExpr = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, exportDefaultDecl.declaration));
    blockBuilder.assignExpr(ucfg_builders_1.fieldAccess('exports', 'default'), resultExpr, node.loc);
    return ast_handlers_1.undefinedResult();
}
exports.handleExportDefaultDeclaration = handleExportDefaultDeclaration;
function handleExportSpecifier(node, _ucfgBuilder, _blockBuilder, childResults, _context) {
    const exportSpecifier = node;
    const localVbl = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, exportSpecifier.local));
    return ast_handlers_1.exportSpecifierResult(exportSpecifier.local.name, exportSpecifier.exported.name, localVbl);
}
exports.handleExportSpecifier = handleExportSpecifier;
function handleExportAllDeclaration(node, ucfgBuilder, blockBuilder, _childResults, context) {
    const decl = node;
    // the `exported` seems to be always there, looks like a `.d.ts` annotation bug.
    if ('exported' in decl) {
        const exported = decl['exported'];
        if (exported) {
            const source = asImportSource(decl.source.value);
            const importedModule = ucfgBuilder.getOrElseUpdateSharedImport(source, importModule(ucfgBuilder, blockBuilder, context));
            blockBuilder.assignExpr(ucfg_builders_1.fieldAccess(EXPORTS, exported.name), importedModule, node.loc);
        }
        // The `export * from 'm'` will be handled later.
    }
    return ast_handlers_1.undefinedResult();
}
exports.handleExportAllDeclaration = handleExportAllDeclaration;
function handleImportSpecifier(node, _ucfgBuilder, _blockBuilder, childResults, _ctx) {
    const importSpec = node;
    const localRes = ast_handlers_1.extractResultForNode(childResults, importSpec.local);
    return ast_handlers_1.importSpecifierResult(localRes, importSpec.imported.name);
}
exports.handleImportSpecifier = handleImportSpecifier;
function handleImportNamespaceSpecifier(node, _ucfgBuilder, _blockBuilder, childResults, _ctx) {
    const importSpec = node;
    const localRes = ast_handlers_1.extractResultForNode(childResults, importSpec.local);
    return ast_handlers_1.importNamespaceSpecifierResult(localRes);
}
exports.handleImportNamespaceSpecifier = handleImportNamespaceSpecifier;
function handleImportDefaultSpecifier(node, _ucfgBuilder, _blockBuilder, childResults, _ctx) {
    const importSpec = node;
    const localRes = ast_handlers_1.extractResultForNode(childResults, importSpec.local);
    return ast_handlers_1.importDefaultSpecifierResult(localRes);
}
exports.handleImportDefaultSpecifier = handleImportDefaultSpecifier;
function handleImportDeclaration(node, ucfgBuilder, blockBuilder, childResults, ctx) {
    const importDecl = node;
    if ('importKind' in importDecl && importDecl['importKind'] === 'type') {
        // Type imports are for TS-compile time only,
        // clauses like `import type { Foo } from 'bar'` are erased at runtime,
        // ignore it for now.
        return ast_handlers_1.undefinedResult();
    }
    const source = asImportSource(importDecl.source.value);
    const moduleVar = ucfgBuilder.getOrElseUpdateSharedImport(source, importModule(ucfgBuilder, blockBuilder, ctx));
    for (const specifier of importDecl.specifiers) {
        if (specifier.type === 'ImportSpecifier') {
            // The `imported as local` in `import { imported as local } from 'moduleName'`
            const importSpecRes = ast_handlers_1.extractResultForNode(childResults, specifier);
            blockBuilder.assignExpr(importSpecRes.local.lValue, ucfg_builders_1.fieldAccess(moduleVar, importSpecRes.imported), node.loc);
        }
        else if (specifier.type === 'ImportDefaultSpecifier') {
            // The `local` in `import local from 'moduleName'`
            const importDefSpecRes = ast_handlers_1.extractResultForNode(childResults, specifier);
            const extractedDefault = blockBuilder.call(backend.IMPORT_DEFAULT, [ucfg_builders_1._undefined(), moduleVar]);
            blockBuilder.assignExpr(importDefSpecRes.local.lValue, extractedDefault, node.loc);
        }
        else {
            // The `local` in `import * as local from 'moduleName'`
            const importNsSpecRes = ast_handlers_1.extractResultForNode(childResults, specifier);
            blockBuilder.assignExpr(importNsSpecRes.local.lValue, moduleVar, node.loc);
        }
    }
    return ast_handlers_1.undefinedResult();
}
exports.handleImportDeclaration = handleImportDeclaration;
function handleDynamicImport(node, ucfgBuilder, blockBuilder, _childResults, ctx) {
    const source = extractDynamicImportSource(node);
    if (source && source.type === 'Literal' && source.value) {
        const moduleVar = ucfgBuilder.getOrElseUpdateSharedImport(asImportSource(source.value), importModule(ucfgBuilder, blockBuilder, ctx));
        const promiseVar = promises_1.promise(node, moduleVar, ucfgBuilder, blockBuilder, ctx);
        return ast_handlers_1.expressionResult(promiseVar);
    }
    else {
        // Temporary workaround
        //
        // Handle resolving of dynamic source
        return ast_handlers_1.undefinedResult();
    }
}
exports.handleDynamicImport = handleDynamicImport;
function extractDynamicImportSource(dynamicImport) {
    // Temporary workaround
    //
    // SonarJS uses an outdated version of typescript-eslint parser, which delivers
    // a non ESLint-compatible AST for dynamic imports. Once it is upgraded, every
    // parser used by SonarJS will then describe dynamic imports with the same type
    // of node, i.e. 'ImportExpression'.
    //
    // Once the upgrade is done, this function helper will no longer be needed, and its call should
    // be replaced with:
    //
    // const source = (node as estree.ImportExpression).source;
    //
    if (dynamicImport.type === 'CallExpression' &&
        dynamicImport.callee.type === 'Import' &&
        dynamicImport.arguments.length === 1) {
        return dynamicImport.arguments[0];
    }
    else if (dynamicImport.type === 'ImportExpression') {
        return dynamicImport.source;
    }
    else {
        return undefined;
    }
}
exports.extractDynamicImportSource = extractDynamicImportSource;
function asImportSource(sourceValue) {
    return ((sourceValue === null || sourceValue === void 0 ? void 0 : sourceValue.toString()) || '__invalid-import-source__');
}
function handleImportEquals(node, ucfgBuilder, blockBuilder, childResults, ctx) {
    const tsNode = convertToTsNode(node);
    const { moduleReference } = tsNode;
    if (moduleReference.type === experimental_utils_1.AST_NODE_TYPES.TSExternalModuleReference &&
        moduleReference.expression.type === 'Literal') {
        const source = moduleReference.expression.value;
        const importedModuleVar = ucfgBuilder.getOrElseUpdateSharedImport(asImportSource(source), importModule(ucfgBuilder, blockBuilder, ctx));
        const { lValue } = ast_handlers_1.extractResultForNode(childResults, tsNode.id);
        blockBuilder.assignExpr(lValue, importedModuleVar, tsNode.loc);
    }
    return ast_handlers_1.undefinedResult();
}
exports.handleImportEquals = handleImportEquals;
function handleExportAssignment(node, ucfgBuilder, blockBuilder, childResults, _ctx) {
    const tsNode = convertToTsNode(node);
    const exportedValue = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, tsNode.expression));
    blockBuilder.assignExpr(ucfg_builders_1.fieldAccess('module', 'exports'), exportedValue, tsNode.loc);
    return ast_handlers_1.undefinedResult();
}
exports.handleExportAssignment = handleExportAssignment;
function convertToTsNode(node) {
    return node;
}
//# sourceMappingURL=module-systems.js.map