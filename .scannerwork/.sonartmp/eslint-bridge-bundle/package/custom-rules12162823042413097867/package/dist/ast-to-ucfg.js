"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
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
exports.handlers = void 0;
/*
 * This module is responsible for rewriting AST-nodes into UCFGs.
 *
 * It primarily is responsible for collecting results from the child nodes, and
 * deciding what is to be emitted, based on the shape of the original node.
 * The creation of actual UCFGs is then delegated to `backend.ts`.
 */
const ast_handlers_1 = require("./ast-handlers");
const ucfg_builders_1 = require("./ucfg-builders");
const pb = __importStar(require("./ucfg_pb"));
const macros = __importStar(require("./macros"));
const backend = __importStar(require("./backend"));
const lexical_structure_1 = require("./lexical-structure");
const moduleSystems = __importStar(require("./module-systems"));
const classes = __importStar(require("./classes"));
const utils_1 = require("./utils");
const ucfg_id_1 = require("./ucfg-id");
// Adding new handler for an AST element
// =====================================
//
// 1. Add / activate the corresponding property in `handlers`.
// 2. If the handler has nothing to do on node entry
//    2a. use an `onExit(handleYourAstElementType)` as handler
//    2b. create the `handleYourAstElementType` method below, with
//        the signature determined by `onExit` parameter type.
//    2c. You will have access to the original node, all current builders,
//        and also all results returned by child nodes.
//    2d. The "results" can have different types, and are tagged: they all
//        have a `type` field, see `AstElementTraversalResult` definition
//        for what's available.
//    2e. You'll often want to convert the results into `Expr`s.
//        There are helper methods (`resultToExpression`, `resultsToExpression`)
//        for that.
//    2f. Use the builders to generate the necessary UCFG-instructions.
//    2g. The handler must return an `AstElementTraversalResult`. There are
//        again helper methods called `<something>Result` for building the
//        wrappers (see e.g. `expressionResult`, `memberExpressionResult`,
//        `undefinedResult` etc.).
//    2h. Returning a value corresponding to JS `undefined` and returning a
//        value that represents `undefined` in UCFG are two different things.
//        See paragraph on `undefined` below.
// 3. If the handler must do something on node entry, you have to implement
//    the entire `AstElementHandler` interface. This will allow you to do
//    two separate steps: one on entry, one on exit.
//    On entry, you get only the original node and the builders (no results
//    from the child nodes are available yet).
//    Once the on-entry step is finished, you have to return the handler that
//    will be called on exit. To construct the on-exit handler,
//    proceed as in part 2.
//
//
// Returning various `undefined` values
// ====================================
//
// An `AstElementTraversalResult` cannot be `undefined`; it must
// always be an object, and it must always have the `type` property.
//
// If a handler is not supposed to "return" anything meaningful to the
// parent AST element, there is a special `AstElementTraversalResult` for that:
// it's an object with just the `type: 'undefined'` property. An instance
// is obtained by invoking `undefinedResult()`.
//
// If a handler is supposed to return a UCFG expression that corresponds to
// an `undefined` in JS, then you have to construct an `AstElementTraversalResult`
// that actually holds an expression. This is best achieved by invoking
// `expressionResult(_undefined())`, whereas `_undefined()` comes from `ucfg_pb`,
// and `expressionResult` is the helper that builds appropriately tagged
// `AstElementTraversalResult`.
//
//
// Example: Without child nodes - string literals
// =========================================
//
// 1. Create a test in `ast-to-ucfg.test.ts`.
// 2. Set JS code to contain something with a string literal, e.g. `print("hello")`;
//    The test should fail now (if `missingImplementationHandler` is set by default in `taint-analysis-rule`,
//    it will also tell you that the missing element type is `Literal`).
// 3. Add `onExit(handleLiteral)` handler for `Literal`.
// 4. Create a `handleLiteral` method. Signature is determined by what `onExit` expects.
// 5. Handle what's important (e.g. strings, numbers, etc.), create a `Expr`
//    in each case.
// 9. `return expressionResult(pbExpr)`
// 10. Fix the test (possibly by copying the expected UCFGs from the terminal)
//
//
// Example: With child nodes - string concatenation
// ================================================
//
// 1. Add test with string concat. It will fail because `BinaryExpression` handler is missing.
// 2. Add handler for `BinaryExpression`. We again need only `onExit`-handler, so it's
//    `BinaryExpression: onExit(handleBinaryExpression)`.
// 3. Create missing `handleBinaryExpression` method, with interface determined by `onExit`.
// 4. Suppose that, for the sake of this example, we want to handle only string concatenation.
//    The more interesting steps in the implementation then are:
//     4a. Convert the `node` into a `estree.BinaryExpression` - that should be a safe cast.
//     4b. Convert the child results into `Expr`s using `resultToExpression`,
//         because we assume that all children are also subexpressions.
//     4c. If the operator is `+`, then use the `blockBuilder` to `call` the
//         special built-in `__concat` method, passing the `Expr`s obtained in
//         the previous step as arguments.
//     4d. Pass the location of the node to the `call` method.
//     4e. The result of `call` method is a variable.
//         Wrap it in an `expressionResult` and return.
// 5. Fix the test.
exports.handlers = {
    ArrayExpression: ast_handlers_1.onExit(handleArrayExpression),
    // ArrayPattern: defaultHandler,
    ArrowFunctionExpression: handleArrowFunctionExpression,
    AssignmentExpression: ast_handlers_1.onExit(handleAssignmentExpression),
    // AssignmentPattern: defaultHandler,
    // AwaitExpression: defaultHandler,
    BinaryExpression: ast_handlers_1.onExit(handleBinaryExpression),
    // BlockStatement: defaultHandler,
    // BreakStatement: defaultHandler,
    CallExpression: ast_handlers_1.onExit(handleCallExpression),
    // CatchClause: defaultHandler,
    // ChainExpression: defaultHandler,
    // ClassBody: defaultHandler,
    ClassDeclaration: ast_handlers_1.onExit(classes.handleClassDeclaration),
    // ClassExpression: defaultHandler,
    // ConditionalExpression: defaultHandler,
    // ContinueStatement: defaultHandler,
    // DebuggerStatement: defaultHandler,
    // DoWhileStatement: defaultHandler,
    // EmptyStatement: defaultHandler,
    ExportAllDeclaration: ast_handlers_1.onExit(moduleSystems.handleExportAllDeclaration),
    ExportDefaultDeclaration: ast_handlers_1.onExit(moduleSystems.handleExportDefaultDeclaration),
    ExportNamedDeclaration: ast_handlers_1.onExit(moduleSystems.handleExportNamedDeclaration),
    ExportSpecifier: ast_handlers_1.onExit(moduleSystems.handleExportSpecifier),
    ExpressionStatement: ast_handlers_1.defaultHandler,
    // ForInStatement: defaultHandler,
    // ForOfStatement: defaultHandler,
    // ForStatement: defaultHandler,
    FunctionDeclaration: handleFunctionDeclaration,
    FunctionExpression: handleFunctionExpression,
    Identifier: ast_handlers_1.onExit(handleIdentifier),
    // IfStatement: defaultHandler,
    ImportDeclaration: ast_handlers_1.onExit(moduleSystems.handleImportDeclaration),
    ImportDefaultSpecifier: ast_handlers_1.onExit(moduleSystems.handleImportDefaultSpecifier),
    ImportExpression: ast_handlers_1.onExit(moduleSystems.handleDynamicImport),
    ImportNamespaceSpecifier: ast_handlers_1.onExit(moduleSystems.handleImportNamespaceSpecifier),
    ImportSpecifier: ast_handlers_1.onExit(moduleSystems.handleImportSpecifier),
    // LabeledStatement: defaultHandler,
    // Line: defaultHandler,
    Literal: ast_handlers_1.onExit(handleLiteral),
    // LogicalExpression: defaultHandler,
    MemberExpression: ast_handlers_1.onExit(handleMemberExpression),
    // MetaProperty: defaultHandler,
    // MethodDefinition: defaultHandler,
    NewExpression: ast_handlers_1.onExit(handleNew),
    ObjectExpression: ast_handlers_1.onExit(handleObjectExpression),
    ObjectPattern: ast_handlers_1.onExit(handleObjectPattern),
    Program: handleProgram,
    Property: ast_handlers_1.onExit(handleProperty),
    // RestElement: defaultHandler,
    ReturnStatement: ast_handlers_1.onExit(handleReturn),
    // SequenceExpression: defaultHandler,
    // SpreadElement: defaultHandler,
    // Super: defaultHandler,
    // SwitchCase: defaultHandler,
    // SwitchStatement: defaultHandler,
    // TaggedTemplateExpression: defaultHandler,
    // TemplateElement: defaultHandler,
    // TemplateLiteral: defaultHandler,
    ThisExpression: ast_handlers_1.onExit(thisHandler),
    // ThrowStatement: defaultHandler,
    // TryStatement: defaultHandler,
    TSImportEqualsDeclaration: ast_handlers_1.onExit(moduleSystems.handleImportEquals),
    TSExportAssignment: ast_handlers_1.onExit(moduleSystems.handleExportAssignment),
    // UnaryExpression: defaultHandler,
    // UpdateExpression: defaultHandler,
    VariableDeclaration: ast_handlers_1.onExit(handleVariableDeclaration),
    VariableDeclarator: ast_handlers_1.onExit(handleVariableDeclarator),
};
/** On-exit handler for identifiers. */
function handleIdentifier(node, ucfgBuilder, blockBuilder, _childResults, ctx) {
    const identifier = node;
    // The following conditional statement should better be replaced by
    // proper binding of the `module` and `exports` variables at module scope;
    // Like this, it will not work when `module` and `exports` are used from
    // inside of functions instead of at top-level of a module.
    if (identifier.name === 'module' || identifier.name === 'exports') {
        return ast_handlers_1.identifierResult(identifier.name, ucfg_builders_1.vbl(identifier.name));
    }
    const lexStruct = ctx.lexicalStructure;
    const resolvedAsRef = lexStruct.resolveRefInUcfg(identifier);
    if (resolvedAsRef) {
        return ast_handlers_1.identifierResult(identifier.name, refAsLValue(resolvedAsRef, ucfgBuilder, blockBuilder));
    }
    const resolvedAsVar = lexStruct.resolveVarInUcfg(identifier);
    if (resolvedAsVar) {
        return ast_handlers_1.identifierResult(identifier.name, varAsLvalue(resolvedAsVar));
    }
    // Renaming with object destructuring introduces identifiers that cannot be resolved
    // with the lexical structure, e.g. `f` in `{ f: foo } = obj`. Those aren't marked as
    // "unresolved" for the sake of pattern matching object destructuring.
    const ancestors = ctx.ruleContext.getAncestors();
    const parent = ancestors.pop();
    const grandparent = ancestors.pop();
    if ((parent === null || parent === void 0 ? void 0 : parent.type) === 'Property' &&
        parent.key === identifier &&
        (grandparent === null || grandparent === void 0 ? void 0 : grandparent.type) === 'ObjectPattern') {
        return ast_handlers_1.identifierResult(identifier.name, ucfg_builders_1.vbl(identifier.name));
    }
    return ast_handlers_1.identifierResult(identifier.name, ucfg_builders_1.vbl(`!unresolved_id:${identifier.name}!`));
}
/**
 * Emits the instructions for an identifier that has been resolved as a reference.
 * The resulting expression can be both read and written into.
 */
function refAsLValue(resolvedAsRef, ucfgBuilder, builder) {
    if (resolvedAsRef instanceof lexical_structure_1.RefOuter) {
        const scopeName = lexical_structure_1.scopeIdToName(resolvedAsRef.scopeId);
        const scopeFetch = builder.expr(ucfg_builders_1.fieldAccess(backend.ENV, scopeName), '');
        return ucfg_builders_1.fieldAccess(scopeFetch, resolvedAsRef.varName);
    }
    else if (resolvedAsRef instanceof lexical_structure_1.RefLocalOnStack) {
        return ucfg_builders_1.vbl(resolvedAsRef.varName);
    }
    else if (resolvedAsRef instanceof lexical_structure_1.RefLocalOnScope) {
        const scopeName = lexical_structure_1.scopeIdToName(resolvedAsRef.scopeId);
        return ucfg_builders_1.fieldAccess(scopeName, resolvedAsRef.varName);
    }
    else if (resolvedAsRef instanceof lexical_structure_1.RefGlobal) {
        // Global, user defined
        const scopeFetch = backend.globalContext(ucfgBuilder, builder);
        return ucfg_builders_1.fieldAccess(scopeFetch, resolvedAsRef.varName);
    }
    else {
        // Global, built-in
        const globalBuiltins = backend.globalContextBuiltins(ucfgBuilder, builder);
        return ucfg_builders_1.fieldAccess(globalBuiltins, resolvedAsRef.varName);
    }
}
/**
 * Constructs an `LValue` for an identifier that has been resolved as variable.
 *
 * Returns either property fetch or a variable, does not emit any instructions.
 */
function varAsLvalue(resolvedAsVar) {
    if (resolvedAsVar.isScopeAllocated) {
        const scopeName = lexical_structure_1.scopeIdToName(resolvedAsVar.effectiveBinding.effectiveScopeId);
        return ucfg_builders_1.fieldAccess(scopeName, resolvedAsVar.effectiveBinding.effectiveName);
    }
    else {
        return ucfg_builders_1.vbl(resolvedAsVar.effectiveBinding.effectiveName);
    }
}
function processIdentifierInRefPosition(identifier, ucfgBuilder, builder, lexStruct) {
    const resolvedAsRef = lexStruct.resolveRefInUcfg(identifier);
    /* istanbul ignore else */
    if (resolvedAsRef) {
        return refAsLValue(resolvedAsRef, ucfgBuilder, builder);
    }
    else {
        // 1. Should not happen: this method should be used only if we are sure
        //    that we are dealing with an identifier in reference position.
        // 2. If it happens: doesn't matter, then we have just one more variable
        //    that doesn't point to anything.
        return ucfg_builders_1.vbl(identifier.name);
    }
}
/**
 * The `onExit`-handler for general call expressions, like
 * `f(x)`, `o.m(x)`, `(arbitraryExpression)(arg1, ..., arg2)` etc.
 *
 * Injects function macros for calls with identifier callees like `f(x)`.
 * Injects method macros for method calls like `a.b(c)`.
 */
function handleCallExpression(node, ucfgBuilder, blockBuilder, childResults, ctx) {
    const { envAllocationStrategy, lexicalStructure } = ctx;
    const callExpr = node;
    const argResults = ast_handlers_1.resultsToExpressions(ast_handlers_1.extractResultForNodes(childResults, callExpr.arguments));
    if (callExpr.callee.type === 'Identifier') {
        const macro = macros.proposeFunctionMacro(callExpr, ctx);
        if (macro) {
            const resExpr = macro(callExpr, argResults, blockBuilder);
            return ast_handlers_1.expressionResult(resExpr);
        }
        else {
            const identifier = callExpr.callee;
            const callee = processIdentifierInRefPosition(identifier, ucfgBuilder, blockBuilder, lexicalStructure);
            const calleeVbl = blockBuilder.ensureStoredInVariable(callee);
            const env = envAllocationStrategy.fetchEnvironmentFromClosure(calleeVbl, blockBuilder);
            return ast_handlers_1.expressionResult(backend.callFunction(calleeVbl, [env, ...argResults], ucfgBuilder, blockBuilder, callExpr.loc));
        }
    }
    else if (callExpr.callee.type === 'MemberExpression') {
        const macro = macros.proposeMethodMacro(callExpr.callee);
        if (macro) {
            const resExpr = macro(callExpr, argResults, blockBuilder);
            return ast_handlers_1.expressionResult(resExpr);
        }
        else {
            // The method calls like `o.m(x)` or `o['m'](x)` require some special care,
            // see the comments for `fieldAccessResult` in `ast-handlers.ts` for more information.
            // In short: we have not only to fetch the method from the object, but we also need
            // to retain the object value, in order to pass it as `this`.
            const { emitFetch } = ast_handlers_1.extractResultForNode(childResults, callExpr.callee);
            const { fetchedValue: method, implicitThis } = emitFetch();
            const methodRef = blockBuilder.ensureIsVariableOrFieldAccess(method);
            const env = envAllocationStrategy.fetchEnvironmentFromClosure(blockBuilder.ensureStoredInVariable(methodRef), blockBuilder);
            return ast_handlers_1.expressionResult(backend.callMethod(methodRef, implicitThis, [env, ...argResults], blockBuilder, callExpr.loc));
        }
    }
    else {
        /* istanbul ignore if */
        if (callExpr.callee.type === 'Import') {
            // Temporary workaround
            //
            // Remove this branch once SonarJS upgrades typescript-eslint parser, which should make
            // dynamic imports described with 'ImportExpression' only.
            return moduleSystems.handleDynamicImport(node, ucfgBuilder, blockBuilder, childResults, ctx);
        }
        else {
            const calleeRes = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, callExpr.callee));
            const calleeVbl = blockBuilder.ensureStoredInVariable(calleeRes);
            const env = envAllocationStrategy.fetchEnvironmentFromClosure(calleeVbl, blockBuilder);
            return ast_handlers_1.expressionResult(backend.callFunction(calleeVbl, [env, ...argResults], ucfgBuilder, blockBuilder, callExpr.loc));
        }
    }
}
function handleNew(node, _ucfgBuilder, blockBuilder, childResults, ctx) {
    const newExpr = node;
    const constructedObjectVar = blockBuilder.newObject('Object', node.loc);
    const constructedObject = constructedObjectVar;
    const constructorUxpr = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, newExpr.callee));
    const constructorFA = blockBuilder.ensureIsVariableOrFieldAccess(constructorUxpr);
    const constructorVar = blockBuilder.ensureStoredInVariable(constructorUxpr);
    const argUxprs = ast_handlers_1.resultsToExpressions(ast_handlers_1.extractResultForNodes(childResults, newExpr.arguments));
    const env = ctx.envAllocationStrategy.fetchEnvironmentFromClosure(constructorVar, blockBuilder);
    backend.callMethod(constructorFA, constructedObject, [env, ...argUxprs], blockBuilder, node.loc);
    backend.setPrototype(constructedObject, ucfg_builders_1.fieldAccess(constructorVar, 'prototype'), blockBuilder);
    // Temporary workaround
    //
    // No way to support `return` from constructors; only effects on `this` are handled.
    return ast_handlers_1.expressionResult(constructedObject);
}
function handleMemberExpression(node, _ucfgBuilder, blockBuilder, childResults) {
    const memberExpr = node;
    const obj = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, memberExpr.object));
    const propRes = ast_handlers_1.extractResultForNode(childResults, memberExpr.property);
    const prop = convertMemberExpressionPropertyToExpression(memberExpr.computed, propRes, blockBuilder);
    const fragment = blockBuilder.beginFragment();
    const objVbl = fragment.ensureStoredInVariable(obj);
    const emitFetch = () => {
        const macro = macros.proposeFieldAccessMacro(memberExpr);
        if (macro) {
            const resExpr = macro(memberExpr, childResults, fragment);
            return {
                fetchedValue: resExpr,
                implicitThis: ucfg_builders_1.vbl('<macros-generate-no-implicit-this>'),
            };
        }
        else {
            const res = backend.fetchObjectProperty(objVbl, prop, fragment, memberExpr.loc);
            return {
                fetchedValue: res,
                implicitThis: objVbl,
            };
        }
    };
    const emitWrite = (storedValue, builder) => {
        const macro = macros.proposeFieldAssignmentMacro(memberExpr);
        if (macro) {
            macro(memberExpr, childResults, storedValue, builder);
        }
        else {
            backend.storeObjectProperty(objVbl, prop, storedValue, builder, memberExpr.loc);
        }
    };
    return ast_handlers_1.memberExpressionResult(emitFetch, emitWrite);
}
/**
 * Similar to `resultToExpression`, but for `MemberExpression` properties, which
 * additionally depend on whether the property was computed (`a[b]`) or not (`a.b`).
 */
function convertMemberExpressionPropertyToExpression(isComputed, propRes, blockBuilder) {
    if (!isComputed && propRes.type === 'identifier') {
        return backend.stringLiteral(propRes.name, blockBuilder);
    }
    else {
        return ast_handlers_1.resultToExpression(propRes);
    }
}
function handleLiteral(node, _ucfgBuilder, blockBuilder) {
    const lit = node;
    if (typeof lit.value === 'string') {
        return ast_handlers_1.expressionResult(backend.stringLiteral(lit.value, blockBuilder));
    }
    else if (typeof lit.value === 'number') {
        return ast_handlers_1.expressionResult(backend.intLiteral(lit.value, blockBuilder));
    }
    else if (typeof lit.value === 'boolean') {
        const boolAsInt = lit.value ? 1 : 0;
        return ast_handlers_1.expressionResult(backend.intLiteral(boolAsInt, blockBuilder));
    }
    // Temporary workaround [no ticket id] (At least RegEx must be handled)
    return ast_handlers_1.expressionResult(ucfg_builders_1._undefined());
}
function handleBinaryExpression(node, _ucfgBuilder, blockBuilder, childReturns) {
    const binExpr = node;
    const left = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childReturns, binExpr.left));
    const right = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childReturns, binExpr.right));
    const operands = [left, right];
    if (binExpr.operator === '+') {
        const res = blockBuilder.call('__concat', operands, {}, undefined, node.loc);
        return ast_handlers_1.expressionResult(res);
    }
    else {
        const builtInName = backend.getBuiltinNameForBinaryOperator(binExpr.operator);
        return ast_handlers_1.expressionResult(blockBuilder.call(builtInName, operands, {}, undefined, node.loc));
    }
}
function provideRequiredScopes(ucfgGeneratingNode, closureEnv, builder, ctx) {
    const envAllocationStrategy = ctx.envAllocationStrategy;
    for (const outerScopeReq of ctx.lexicalStructure.getOuterScopeRequirements(ucfgGeneratingNode)) {
        const scopeId = outerScopeReq.scopeId;
        const scopeName = lexical_structure_1.scopeIdToName(scopeId);
        if (outerScopeReq instanceof lexical_structure_1.RequireOuterScope) {
            envAllocationStrategy.propagateIntoNestedEnvironment(ucfg_builders_1.vbl(backend.ENV), closureEnv, scopeName, builder);
        }
        else {
            builder.assignExpr(ucfg_builders_1.fieldAccess(closureEnv, scopeName), ucfg_builders_1.vbl(scopeName));
        }
    }
    envAllocationStrategy.propagateIntoNestedEnvironment(ucfg_builders_1.vbl(backend.ENV), closureEnv, 'global', builder);
}
/**
 * Handles function declarations like `function bar() { ... }`.
 */
function handleFunctionDeclaration(node, ucfgBuilder, blockBuilder, ctx) {
    const funcDecl = node;
    /* istanbul ignore else */
    if (ucfgBuilder.parentBuilders) {
        // Generate the expression in the parent builder
        const ucfgId = ucfgBuilder.getMethodId();
        let hoistingBuilder;
        const maybeUcfgHoistingBuilder = ucfgBuilder.parentBuilders.ucfgBuilder.getFragmentBuilder('hoisting');
        /* istanbul ignore else */
        if (maybeUcfgHoistingBuilder) {
            hoistingBuilder = maybeUcfgHoistingBuilder;
        }
        else {
            hoistingBuilder = ucfgBuilder.parentBuilders.blockBuilder.beginFragment();
        }
        const functionValue = backend.declareFunction(ucfgId, hoistingBuilder);
        assembleEnvironmentOnDeclarationSite(node, functionValue, hoistingBuilder, ctx);
        if (funcDecl.id) {
            const resolvedVar = ctx.lexicalStructure.resolveVarInUcfg(funcDecl.id);
            const lVal = resolvedVar ? varAsLvalue(resolvedVar) : ucfg_builders_1.vbl(funcDecl.id.name);
            hoistingBuilder.assignExpr(lVal, functionValue, funcDecl.id.loc);
        }
        attachPrototypeProperty(functionValue, ucfgBuilder.parentBuilders.ucfgBuilder, hoistingBuilder);
        // Set up the child builders
        ucfgBuilder.setLocation(utils_1.extractNeatUcfgLocation(funcDecl));
        const scopeId = ctx.lexicalStructure.getScopeIdForNode(node);
        const scopeFragmentBuilder = getScopeFragmentBuilder(ucfgBuilder, blockBuilder);
        createScopeIfNecessary(funcDecl, scopeFragmentBuilder, ctx.lexicalStructure);
        backend.setupCalleeParameters(processFunctionParameters(funcDecl.params, scopeId, scopeFragmentBuilder, ctx.lexicalStructure), ucfgBuilder);
        return () => { var _a; return ast_handlers_1.functionExpressionResult(ucfgId, functionValue, (_a = funcDecl.id) === null || _a === void 0 ? void 0 : _a.name); };
    }
    else {
        // never occurs. A function declaration is not `Program`, and thus
        // can never be a top-level element. It must have a parent element.
        return () => ast_handlers_1.undefinedResult();
    }
}
function attachPrototypeProperty(functionValue, parentUcfgBuilder, builder) {
    const prototypeProperty = builder.newObject('Object');
    const globalBuiltins = backend.globalContextBuiltins(parentUcfgBuilder, builder);
    const objectConstructor = builder.expr(ucfg_builders_1.fieldAccess(globalBuiltins, 'Object'));
    const objectPrototype = builder.expr(ucfg_builders_1.fieldAccess(objectConstructor, 'prototype'));
    // Set the prototype of the `f.prototype` property so that
    // `f.prototype.__proto__ === Object.prototype` holds.
    backend.setPrototype(prototypeProperty, objectPrototype, builder);
    builder.assignExpr(ucfg_builders_1.fieldAccess(functionValue, 'prototype'), prototypeProperty);
}
function handleFunctionExpression(node, ucfgBuilder, blockBuilder, ctx) {
    /* istanbul ignore else */
    if (ucfgBuilder.parentBuilders) {
        const ucfgId = ucfgBuilder.getMethodId();
        const parentBuilder = ucfgBuilder.parentBuilders.blockBuilder;
        const functionValue = backend.declareFunction(ucfgId, parentBuilder);
        assembleEnvironmentOnDeclarationSite(node, functionValue, parentBuilder, ctx);
        attachPrototypeProperty(functionValue, ucfgBuilder.parentBuilders.ucfgBuilder, parentBuilder);
        // Set up the child builders
        const fctExpr = node;
        ucfgBuilder.setLocation(utils_1.extractNeatUcfgLocation(fctExpr));
        const scopeId = ctx.lexicalStructure.getScopeIdForNode(fctExpr);
        const scopeFragmentBuilder = getScopeFragmentBuilder(ucfgBuilder, blockBuilder);
        createScopeIfNecessary(fctExpr, scopeFragmentBuilder, ctx.lexicalStructure);
        backend.setupCalleeParameters(processFunctionParameters(fctExpr.params, scopeId, scopeFragmentBuilder, ctx.lexicalStructure), ucfgBuilder);
        return () => ast_handlers_1.functionExpressionResult(ucfgId, functionValue);
    }
    else {
        // impossible: function expressions are always children of something, and
        // never top-level elements.
        return () => ast_handlers_1.undefinedResult();
    }
}
function assembleEnvironmentOnDeclarationSite(node, functionValue, parentBuilder, ctx) {
    const { envAllocationStrategy } = ctx;
    const env = envAllocationStrategy.allocateEnvironment(parentBuilder);
    provideRequiredScopes(node, env, parentBuilder, ctx);
    envAllocationStrategy.attachEnvironmentToClosure(functionValue, env, parentBuilder);
    return env;
}
function handleArrowFunctionExpression(node, ucfgBuilder, blockBuilder, ctx) {
    /* istanbul ignore else */
    if (ucfgBuilder.parentBuilders) {
        // Generate the expression in parent builder
        const parentBuilder = ucfgBuilder.parentBuilders.blockBuilder;
        const ucfgId = ucfgBuilder.getMethodId();
        const arrowValue = backend.declareFunction(ucfgId, parentBuilder);
        const arrowEnv = assembleEnvironmentOnDeclarationSite(node, arrowValue, parentBuilder, ctx);
        const ancestor = findFirstThisBinderAncestor(ctx.ruleContext.getAncestors().reverse());
        if (ancestor && ancestor.type === 'ArrowFunctionExpression') {
            // The enclosing arrow does not bind `this`. Get it from the outside: it's assumed to be stored in `env`-arg.
            ctx.envAllocationStrategy.storeOuterLexicalThis(arrowEnv, ctx.lexicalThisState, parentBuilder);
        }
        else {
            // The enclosing function binds `this`. Save it in the environment.
            ctx.envAllocationStrategy.storeCurrentLexicalThis(arrowEnv, ctx.lexicalThisState, parentBuilder);
        }
        // Set up the child builders
        const arrExpr = node;
        ucfgBuilder.setLocation(utils_1.extractNeatUcfgLocation(arrExpr));
        const scopeId = ctx.lexicalStructure.getScopeIdForNode(node);
        const scopeFragmentBuilder = getScopeFragmentBuilder(ucfgBuilder, blockBuilder);
        createScopeIfNecessary(node, scopeFragmentBuilder, ctx.lexicalStructure);
        backend.setupCalleeParameters(processFunctionParameters(arrExpr.params, scopeId, scopeFragmentBuilder, ctx.lexicalStructure), ucfgBuilder);
        return childResults => {
            if (arrExpr.expression) {
                blockBuilder.ret(ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, arrExpr.body)), arrExpr.body.loc);
            }
            return ast_handlers_1.functionExpressionResult(ucfgId, arrowValue);
        };
    }
    else {
        // impossible: function expressions are always children of something, and
        // never top-level elements.
        return () => ast_handlers_1.undefinedResult();
    }
}
function processFunctionParameters(params, scopeId, scopeFragmentBuilder, lexicalStructure) {
    const scopeName = lexical_structure_1.scopeIdToName(scopeId);
    return params.map((pattern, idx) => {
        if (pattern.type === 'Identifier') {
            const paramName = pattern.name;
            const paramVar = ucfg_builders_1.vbl(paramName);
            const resolved = lexicalStructure.resolveVarInUcfg(pattern);
            /* istanbul ignore else */
            if (resolved) {
                if (resolved.isScopeAllocated) {
                    scopeFragmentBuilder.assignExpr(ucfg_builders_1.fieldAccess(scopeName, resolved.effectiveBinding.effectiveName), paramVar, pattern.loc);
                }
                else {
                    /*
                     * Intentionally left blank.
                     *
                     * It's just a purely stack-local variable, we can use the parameter as-is.
                     */
                }
            }
            else {
                // 1. Should not occur: all variables occurring in parameter list are
                //    reliably recognized as binders by eslint.
                // 2. Doesn't matter if it occurs after all: one undefined local variable more
                //    won't have severe consequences, and will also be clearly visible in generated
                //    UCFGs.
            }
            return paramVar;
        }
        else {
            // Temporary workaround [no ticket] Handle all the other patterns correctly.
            //
            // For this, the builder will be required (unpacking will be transformed
            // into multiple instructions in the UCFG's body).
            return ucfg_builders_1.vbl(`%arg_${idx}`);
        }
    });
}
function handleReturn(node, _ucfgBuilder, blockBuilder, childResults, _ctx) {
    const retStmt = node;
    const res = retStmt.argument
        ? ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, retStmt.argument))
        : ucfg_builders_1._undefined();
    backend.ret(res, blockBuilder, retStmt.loc);
    return ast_handlers_1.undefinedResult();
}
function handleAssignmentExpression(node, _ucfgBuilder, blockBuilder, childResults) {
    const asgnExpr = node;
    const lhsPattern = asgnExpr.left;
    const rhsNode = asgnExpr.right;
    const lhsRes = ast_handlers_1.extractResultForNode(childResults, lhsPattern);
    const rhsRes = ast_handlers_1.extractResultForNode(childResults, rhsNode);
    if (asgnExpr.operator === '=') {
        return handleAssignmentLike(lhsPattern, lhsRes, rhsRes, blockBuilder);
    }
    else {
        return ast_handlers_1.expressionResult(ucfg_builders_1._undefined());
    }
}
function handleVariableDeclarator(node, _ucfgBuilder, blockBuilder, childResults) {
    const decl = node;
    const lhsNode = decl.id;
    const rhsNode = decl.init;
    if (rhsNode) {
        const lhsRes = ast_handlers_1.extractResultForNode(childResults, lhsNode);
        const rhsRes = ast_handlers_1.extractResultForNode(childResults, rhsNode);
        handleAssignmentLike(lhsNode, lhsRes, rhsRes, blockBuilder);
        if (lhsNode.type === 'Identifier') {
            return ast_handlers_1.variableDeclaratorResult(ast_handlers_1.resultToExpression(rhsRes), lhsNode.name);
        }
        else {
            return ast_handlers_1.variableDeclaratorResult(ast_handlers_1.resultToExpression(rhsRes));
        }
    }
    return ast_handlers_1.variableDeclaratorResult(ucfg_builders_1._undefined());
}
function handleVariableDeclaration(node, _ucfgBuilder, _blockBuilder, childResults) {
    const declaration = node;
    const declaratorResults = ast_handlers_1.extractResultForNodes(childResults, declaration.declarations);
    return ast_handlers_1.variableDeclarationResult(declaratorResults.map(d => d));
}
/**
 * Handles assignment-like expressions / variable declarators,
 * including different left-hand sides (property writes, various
 * patterns).
 */
function handleAssignmentLike(lhs, lhsResult, rhsResult, blockBuilder) {
    const rhsUxpr = ast_handlers_1.resultToExpression(rhsResult);
    if (lhs.type === 'Identifier') {
        const lhsIdRes = lhsResult;
        blockBuilder.assignExpr(lhsIdRes.lValue, rhsUxpr, lhs.loc);
    }
    else if (lhs.type === 'MemberExpression') {
        const { emitWrite } = lhsResult;
        emitWrite(rhsUxpr, blockBuilder);
        return ast_handlers_1.expressionResult(ucfg_builders_1._undefined());
    }
    else if (lhs.type === 'ObjectPattern') {
        resolvePatternMatching(lhsResult, rhsUxpr, blockBuilder, lhs.loc);
        return ast_handlers_1.expressionResult(ucfg_builders_1._undefined());
    }
    // (handle patterns here)
    return ast_handlers_1.expressionResult(ucfg_builders_1._undefined());
}
function resolvePatternMatching(pattern, scrutinee, blockBuilder, loc) {
    /* istanbul ignore else */
    if (pattern.type === 'identifier') {
        blockBuilder.assignExpr(pattern.lValue, scrutinee, loc);
    }
    else if (pattern.type === 'objectPattern') {
        pattern.properties.forEach(p => resolvePatternMatching(p, scrutinee, blockBuilder, loc));
    }
    else if (pattern.type === 'propertyPattern') {
        let field;
        if (pattern.key instanceof pb.Variable) {
            field = pattern.key;
        }
        else if (pattern.key instanceof pb.Constant) {
            field = pattern.key.getValue();
        }
        /* istanbul ignore else */
        if (field) {
            const scrutineeVar = blockBuilder.expr(scrutinee, undefined, loc);
            const newScrutinee = ucfg_builders_1.fieldAccess(scrutineeVar, field);
            resolvePatternMatching(pattern.pattern, newScrutinee, blockBuilder, loc);
        }
        else {
            // Temporary workaround.
            //
            // Handle computed properties, i.e. { [key]: pttrn } = obj.
        }
    }
    else {
        // Temporary workaround.
        //
        // Handle array pattern, assignment pattern, and rest element.
    }
}
function handleProperty(node, _ucfgBuilder, blockBuilder, childResults, ctx) {
    const propertyNode = node;
    const keyNode = propertyNode.key;
    const valueNode = propertyNode.value;
    if (isAssignmentProperty(node, ctx)) {
        // ESLint properties come in two flavors: regular properties and assignment properties.
        // Assignment properties are only used with object patterns. Their traversal results
        // are eventually processed when resolving pattern matching of object destructuring.
        const key = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, keyNode));
        const value = ast_handlers_1.extractResultForNode(childResults, valueNode);
        return ast_handlers_1.propertyPatternResult(key, value);
    }
    else {
        const key = convertMemberExpressionPropertyToExpression(propertyNode.computed, ast_handlers_1.extractResultForNode(childResults, keyNode), blockBuilder);
        const value = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, valueNode));
        return ast_handlers_1.propertyResult(key, value);
    }
}
function isAssignmentProperty(_node, ctx) {
    const parent = ctx.ruleContext.getAncestors().pop();
    /* istanbul ignore else */
    if (parent) {
        return parent.type === 'ObjectPattern';
    }
    else {
        // It should not happen: only a `Program` node doesn't have a parent.
        return false;
    }
}
function handleArrayExpression(node, ucfgBuilder, blockBuilder, _childResults) {
    const res = blockBuilder.newObject('Array', node.loc);
    // Temporary workaround.
    //
    // Only connects the array with the prototype, does not actually add any entries yet.
    const globalBuiltins = backend.globalContextBuiltins(ucfgBuilder, blockBuilder);
    const arrayCons = blockBuilder.expr(ucfg_builders_1.fieldAccess(globalBuiltins, 'Array'));
    backend.setPrototype(res, ucfg_builders_1.fieldAccess(arrayCons, 'prototype'), blockBuilder);
    return ast_handlers_1.expressionResult(res);
}
function handleObjectExpression(node, _ucfgBuilder, blockBuilder, childResults) {
    const objectExpression = node;
    const obj = blockBuilder.newObject('Object', node.loc);
    for (const property of objectExpression.properties) {
        if (property.type === 'Property') {
            const { key, value } = ast_handlers_1.extractResultForNode(childResults, property);
            backend.storeObjectProperty(obj, key, value, blockBuilder, property.loc);
        }
        else {
            // Temporary workaround
            //
            // Handle { ...spreadOperator }
        }
    }
    return ast_handlers_1.expressionResult(obj);
}
function handleObjectPattern(node, _ucfgBuilder, _blockBuilder, childResults) {
    const { properties } = node;
    return ast_handlers_1.objectPatternResult(ast_handlers_1.extractResultForNodes(childResults, properties));
}
function handleProgram(node, ucfgBuilder, blockBuilder, ctx) {
    ucfgBuilder.setMethodId(ucfg_id_1.ucfgIdForModule(ctx.ruleContext.getFilename()));
    if (ctx.includePreamble) {
        let preambleBuilder;
        const maybeUcfgPreambleBuilder = ucfgBuilder.getFragmentBuilder('preamble');
        /* istanbul ignore else */
        if (maybeUcfgPreambleBuilder) {
            preambleBuilder = maybeUcfgPreambleBuilder;
        }
        else {
            // impossible. A `Program`'s UCFG builder always includes a fragment builder
            // for function hoisting, used here for the sake of preamble generation.
            preambleBuilder = blockBuilder.beginFragment();
        }
        preambleBuilder.assignNewObject(backend.ENV, 'Object');
        preambleBuilder.assignNewObject(ucfg_builders_1.fieldAccess(backend.ENV, 'global'), 'Object');
        preambleBuilder.assignNewObject('module', 'Object');
        preambleBuilder.assignExpr(ucfg_builders_1.fieldAccess('module', 'exports'), ucfg_builders_1._this());
        preambleBuilder.assignExpr('exports', ucfg_builders_1._this());
    }
    const scopeFragmentBuilder = getScopeFragmentBuilder(ucfgBuilder, blockBuilder);
    createScopeIfNecessary(node, scopeFragmentBuilder, ctx.lexicalStructure);
    return () => ast_handlers_1.undefinedResult();
}
function thisHandler(_node, _ucfgBuilder, _blockBuilder, _childResults, ctx) {
    const firstThisBindingAncestor = findFirstThisBinderAncestor(ctx.ruleContext.getAncestors().reverse());
    if (firstThisBindingAncestor && firstThisBindingAncestor.type === 'ArrowFunctionExpression') {
        return ast_handlers_1.expressionResult(ctx.envAllocationStrategy.fetchLexicalThis(ctx.lexicalThisState));
    }
    else {
        return ast_handlers_1.expressionResult(ucfg_builders_1._this());
    }
}
function findFirstThisBinderAncestor(ancestors) {
    return ancestors.find(node => ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type));
}
/**
 * Tries as hard as possible to obtain a scope fragment builder from the `builders`.
 *
 * Creates a new one, if necessary.
 */
function getScopeFragmentBuilder(ucfgBuilder, blockBuilder) {
    const maybeFragmentBuilder = ucfgBuilder.getFragmentBuilder('scope');
    /* istanbul ignore else */
    if (maybeFragmentBuilder) {
        return maybeFragmentBuilder;
    }
    else {
        // 1. It should not happen: a scope fragment builder is created in every entry block.
        // 2. If it happens anyway, it doesn't matter: some instructions might end up in the
        //    wrong place, but that's not critical.
        const newScopeFragmentBuilder = blockBuilder.beginFragment();
        ucfgBuilder.setFragmentBuilder('scope', newScopeFragmentBuilder);
        return newScopeFragmentBuilder;
    }
}
/**
 * Sets up a scope object if necessary.
 */
function createScopeIfNecessary(node, scopeFragmentBuilder, lexicalStructure) {
    if (lexicalStructure.isScopeMaterialized(node)) {
        const scope = lexicalStructure.getScopeForNode(node);
        /* istanbul ignore else */
        if (scope) {
            const scopeId = lexicalStructure.getScopeId(scope);
            const scopeName = lexical_structure_1.scopeIdToName(scopeId);
            scopeFragmentBuilder.assignNewObject(scopeName, 'Object');
        }
        // 1. Cannot happen: `isScopeMaterialized` must imply that a scope is found.
        // 2. If it happens: doesn't matter, then we simply omit a few instructions.
    }
}
//# sourceMappingURL=ast-to-ucfg.js.map