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
exports.proposeFieldAssignmentMacro = exports.proposeFieldAccessMacro = exports.proposeMethodMacro = exports.proposeFunctionMacro = void 0;
const ucfg_builders_1 = require("./ucfg-builders");
const ast_handlers_1 = require("./ast-handlers");
const backend = __importStar(require("./backend"));
const ucfg_id_1 = require("./ucfg-id");
/** Attempts to find an appropriate macro based on identifier in the call expression. */
function proposeFunctionMacro(callExpr, ctx) {
    const callee = callExpr.callee;
    const calleeName = callee.name;
    // A built-in taint source for tests.
    if (calleeName === 'TAINT_SOURCE') {
        return (n, args, blockBuilder) => {
            return blockBuilder.call('__sql_injection_source', args, {}, undefined, n.loc);
        };
    }
    else if (calleeName === 'TAINT_SINK') {
        return (n, args, blockBuilder) => {
            for (const a of args.slice(0, 1)) {
                blockBuilder.call('__sql_injection_sink', [ucfg_builders_1._undefined(), a], {}, undefined, n.loc);
            }
            return ucfg_builders_1._undefined();
        };
    }
    else if (calleeName === 'require') {
        const [arg] = callExpr.arguments;
        if (arg.type === 'Literal' && arg.value) {
            const module = arg.value.toString();
            const resolved = ctx.resolveModule(module);
            if (resolved) {
                console.log(`DEBUG Resolved require '${module}' to '${resolved}'`);
                return (n, args, blockBuilder) => {
                    const ucfgId = ucfg_id_1.ucfgIdForModule(resolved);
                    const receiver = blockBuilder.newObject('Object');
                    return blockBuilder.call(ucfgId, [receiver], {}, undefined, callee.loc);
                };
            }
        }
        return undefined;
    }
}
exports.proposeFunctionMacro = proposeFunctionMacro;
function proposeMethodMacro(callee) {
    if (callee.property.type === 'Identifier' &&
        callee.property.name === 'query' &&
        callee.object.type === 'Identifier' &&
        callee.object.name.startsWith('conn')) {
        return sqliSinkMacro;
    }
    return undefined;
}
exports.proposeMethodMacro = proposeMethodMacro;
function proposeFieldAccessMacro(fieldAccessExpr) {
    if (fieldAccessExpr.property.type === 'Identifier' &&
        fieldAccessExpr.property.name === 'argv' &&
        fieldAccessExpr.object.type === 'Identifier' &&
        fieldAccessExpr.object.name.startsWith('proc')) {
        return sqliSourceMacro;
    }
    else if (propertyToString(fieldAccessExpr) === '__proto__') {
        return getProtoMacro;
    }
    return undefined;
}
exports.proposeFieldAccessMacro = proposeFieldAccessMacro;
function proposeFieldAssignmentMacro(fieldAccessExpr) {
    const fieldName = propertyToString(fieldAccessExpr);
    if (fieldName === '__proto__') {
        return setProtoMacro;
    }
    else if (fieldName && WATCHED_PROPERTIES.includes(fieldName)) {
        return watchAssignmentMacro(fieldName);
    }
}
exports.proposeFieldAssignmentMacro = proposeFieldAssignmentMacro;
function sqliSinkMacro(node, argResults, blockBuilder) {
    if (argResults.length > 0 && node.arguments.length > 0) {
        const arg = argResults[0];
        const loc = node.arguments[0].loc;
        blockBuilder.call('__sql_injection_sink', [ucfg_builders_1._undefined(), arg], {}, undefined, loc);
    }
    return ucfg_builders_1._undefined();
}
function sqliSourceMacro(node, _childExpressions, builder) {
    return builder.call('__sql_injection_source', [], {}, undefined, node.loc);
}
function propertyToString(memberExpr) {
    if (memberExpr.computed) {
        if (memberExpr.property.type === 'Literal') {
            return String(memberExpr.property.value);
        }
        else {
            return undefined;
        }
    }
    else {
        /* istanbul ignore else */
        if (memberExpr.property.type === 'Identifier') {
            return memberExpr.property.name;
        }
        // The `else` case cannot occur: if it's not computed, it must be a fixed identifier.
    }
}
function watchAssignmentMacro(propertyName) {
    return (node, childResults, assignedValue, builder) => {
        const obj = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, node.object));
        const methodRef = ucfg_builders_1.fieldAccess(builder.ensureStoredInVariable(obj), '__setWatchedProperty');
        builder.dynamicCall(methodRef, [obj, ucfg_builders_1._undefined(), ucfg_builders_1.stringLiteral(propertyName), assignedValue], {}, undefined, node.loc);
        backend.storeObjectProperty(builder.ensureStoredInVariable(obj), ucfg_builders_1.stringLiteral(propertyName), assignedValue, builder, node.loc);
    };
}
function setProtoMacro(node, childResults, assignedValue, builder) {
    const objUxpr = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, node.object));
    backend.setPrototype(objUxpr, assignedValue, builder, node.loc);
}
function getProtoMacro(node, childResults, builder) {
    const objUxpr = ast_handlers_1.resultToExpression(ast_handlers_1.extractResultForNode(childResults, node.object));
    return backend.getPrototype(objUxpr, builder, node.loc);
}
/**
 * When a field with this name is accessed, we call a magic function for the engine's stubs to be able
 * to handle special cases (e.g. when assigning a tainted value to this field should raise an issue)
 */
// TODO: SONARSEC-1926 shared declaration location with engine
const WATCHED_PROPERTIES = ['innerHTML', 'outerHTML'];
//# sourceMappingURL=macros.js.map