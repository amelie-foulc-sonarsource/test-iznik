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
exports.getBuiltinNameForBinaryOperator = exports.EnvironmentAllocation = exports.assignExprToField = exports.setPrototype = exports.getPrototype = exports.storeObjectProperty = exports.fetchObjectProperty = exports.setupCalleeParameters = exports.ret = exports.declareFunction = exports.intLiteral = exports.stringLiteral = exports.globalContextBuiltins = exports.globalContext = exports.callMethod = exports.callFunction = exports.THIS = exports.ENV = exports.IMPORT_DEFAULT = void 0;
/*
 * Contains low-level details of emitting UCFGs in a
 * format that the backend expects.
 *
 * The functions in this module are concerned neither with marshalling /
 * unmarshalling of partial results from child nodes to parent nodes,
 * nor with decisions about what has to be actually emitted - that should've
 * been done in `ast-to-ucfg`.
 */
const pb = __importStar(require("./ucfg_pb"));
const ucfg_builders_1 = require("./ucfg-builders");
const INITIALIZE_GLOBAL = '__initializeGlobal';
const GLOBAL_BUILTINS = '%globalBuiltins';
exports.IMPORT_DEFAULT = '__importDefault';
/**
 * Name for both the second synthetic variable of every method, as well
 * as for the property of function objects that hold the environment of the
 * closure.
 */
exports.ENV = '%env';
/**
 * Name of the env-property that stores the value of lexically bound `this`.
 */
exports.THIS = '_this';
/**
 * Handles function calls of shape `f(x1, ..., xn)` where `f` is not a member
 * expression (and thus does not provide an implicit `this`).
 */
function callFunction(callee, argExprs, ucfgBuilder, blockBuilder, loc) {
    const rcvArgs = [globalContext(ucfgBuilder, blockBuilder), ...argExprs];
    return blockBuilder.dynamicCall(callee, rcvArgs, {}, undefined, loc);
}
exports.callFunction = callFunction;
/**
 * Handles method calls of shape `objExpr.methodName(a1, ..., aN)`.
 */
function callMethod(lookedUpMethod, receiverThis, argExprs, blockBuilder, loc) {
    const rcvArgs = [receiverThis, ...argExprs];
    return blockBuilder.dynamicCall(lookedUpMethod, rcvArgs, {}, undefined, loc);
}
exports.callMethod = callMethod;
/**
 * Returns a variable that refers to the `global`-context of the current UCFG.
 *
 * Creates the variable once, if necessary.
 */
function globalContext(ucfgBuilder, blockBuilder) {
    if (!ucfgBuilder.checkHasSharedDef('global')) {
        const sharedReadonlyFragment = ucfgBuilder.getFragmentBuilder('shared-readonly') || blockBuilder;
        sharedReadonlyFragment.assignExpr('%global', ucfg_builders_1.fieldAccess(exports.ENV, 'global'));
        ucfgBuilder.setHasSharedDef('global');
    }
    return ucfg_builders_1.vbl('%global');
}
exports.globalContext = globalContext;
/**
 * Returns a variable that refers to the global built-ins (coming from stub system).
 *
 * Creates the variable once, if necessary.
 */
function globalContextBuiltins(ucfgBuilder, blockBuilder) {
    if (!ucfgBuilder.checkHasSharedDef('globalBuiltins')) {
        const sharedReadonlyFragment = ucfgBuilder.getFragmentBuilder('shared-readonly') || blockBuilder;
        sharedReadonlyFragment.assignCall(GLOBAL_BUILTINS, INITIALIZE_GLOBAL);
        ucfgBuilder.setHasSharedDef('globalBuiltins');
    }
    return ucfg_builders_1.vbl(GLOBAL_BUILTINS);
}
exports.globalContextBuiltins = globalContextBuiltins;
/**
 * Sets up a JS string literal (with all required prototypes).
 */
function stringLiteral(s, _builder) {
    // Temporary workaround: connect with `String`-prototype
    return ucfg_builders_1.stringLiteral(s);
}
exports.stringLiteral = stringLiteral;
/**
 * Instantiates a JS integer literal (with all required prototypes).
 */
function intLiteral(n, _blockBuilder) {
    // Temporary workaround: connect with `Number`-prototype
    return ucfg_builders_1.intLiteral(n);
}
exports.intLiteral = intLiteral;
/** Invokes a magic UCFG-method that converts a string literal into a FunctionReferenceSymbol. */
function declareFunction(ucfgId, blockBuilder) {
    return blockBuilder.call('__declareFunction', [ucfg_builders_1.stringLiteral(ucfgId)]);
}
exports.declareFunction = declareFunction;
/**
 * Processes a return statement.
 */
function ret(result, blockBuilder, loc) {
    blockBuilder.ret(result, loc);
}
exports.ret = ret;
/**
 * Creates parameters on the callee-side of the caller-callee contract.
 */
function setupCalleeParameters(params, ucfgBuilder) {
    ucfgBuilder.setParameters([ucfg_builders_1.vbl(exports.ENV), ...params]);
}
exports.setupCalleeParameters = setupCalleeParameters;
function fetchObjectProperty(objVar, property, builder, fieldAccessLoc) {
    const key = attemptConvertToConstantString(property);
    if (key) {
        return ucfg_builders_1.fieldAccess(objVar, key);
    }
    else {
        return builder.call('__mapGet', [objVar, property], {}, undefined, fieldAccessLoc);
    }
}
exports.fetchObjectProperty = fetchObjectProperty;
function storeObjectProperty(objVar, property, value, builder, fieldWriteLoc) {
    const key = attemptConvertToConstantString(property);
    if (key === '__proto__') {
        setPrototype(objVar, value, builder, fieldWriteLoc);
    }
    else if (key) {
        builder.assignExpr(ucfg_builders_1.fieldAccess(objVar, key), value, fieldWriteLoc);
    }
    else {
        builder.call('__mapSet', [objVar, property, value], {}, undefined, fieldWriteLoc);
    }
}
exports.storeObjectProperty = storeObjectProperty;
// Temporary workaround
//
// UCFG currently don't support non-constant-string property keys.
//
// This method should be eventually eliminated altogether.
function attemptConvertToConstantString(property) {
    if (property instanceof pb.Constant) {
        return property.getValue();
    }
    else {
        return undefined;
    }
}
function getPrototype(obj, builder, loc) {
    return builder.call('__getProto', [obj], {}, undefined, loc);
}
exports.getPrototype = getPrototype;
function setPrototype(obj, prototyp, builder, loc) {
    builder.call('__setProto', [obj, prototyp], {}, undefined, loc);
}
exports.setPrototype = setPrototype;
function assignExprToField(object, field, expr, builder, loc) {
    builder.assignExpr(ucfg_builders_1.fieldAccess(builder.expr(object, undefined, loc), field), expr, loc);
}
exports.assignExprToField = assignExprToField;
var EnvironmentAllocation;
(function (EnvironmentAllocation) {
    function defaultEnvironmentAllocation() {
        return new DefaultEnvironmentAllocationStrategy();
    }
    EnvironmentAllocation.defaultEnvironmentAllocation = defaultEnvironmentAllocation;
    function mergingEnvironmentAllocation() {
        return new MergingEnvironmentAllocationStrategy();
    }
    EnvironmentAllocation.mergingEnvironmentAllocation = mergingEnvironmentAllocation;
    class DefaultEnvironmentAllocationStrategy {
        allocateEnvironment(builder) {
            return builder.newObject('Object');
        }
        attachEnvironmentToClosure(closure, env, builder) {
            storeObjectProperty(closure, stringLiteral(exports.ENV, builder), env, builder);
        }
        fetchEnvironmentFromClosure(closure, builder) {
            return fetchObjectProperty(closure, stringLiteral(exports.ENV, builder), builder);
        }
        propagateIntoNestedEnvironment(outerEnv, nestedEnv, scopeName, builder) {
            builder.assignExpr(ucfg_builders_1.fieldAccess(nestedEnv, scopeName), ucfg_builders_1.fieldAccess(outerEnv, scopeName));
        }
        storeCurrentLexicalThis(env, _lexicalThisState, builder) {
            builder.assignExpr(ucfg_builders_1.fieldAccess(env, exports.THIS), ucfg_builders_1._this());
        }
        storeOuterLexicalThis(nestedEnv, _lexicalThisState, builder) {
            builder.assignExpr(ucfg_builders_1.fieldAccess(nestedEnv, exports.THIS), ucfg_builders_1.fieldAccess(exports.ENV, exports.THIS));
        }
        fetchLexicalThis(_lexicalThisState) {
            return ucfg_builders_1.fieldAccess(exports.ENV, exports.THIS);
        }
    }
    class MergingEnvironmentAllocationStrategy {
        allocateEnvironment(_builder) {
            return ucfg_builders_1.vbl(exports.ENV);
        }
        attachEnvironmentToClosure(_closure, _env, _builder) { }
        fetchEnvironmentFromClosure(_closure, _builder) {
            return ucfg_builders_1.vbl(exports.ENV);
        }
        propagateIntoNestedEnvironment(_outerEnv, _nestedEnv, _scopeName, _builder) {
            /*
             * intentionally left blank.
             *
             * In the fallback mode, the _outerEnv and the _nestedEnv are the same object,
             * no need to copy anything over.
             */
        }
        storeCurrentLexicalThis(env, lexicalThisState, builder) {
            builder.assignExpr(ucfg_builders_1.fieldAccess(env, lexicalThisState.lastThisBindingName), ucfg_builders_1._this());
        }
        storeOuterLexicalThis(nestedEnv, lexicalThisState, builder) {
            // intentionally left blank.
            // No need to copy anything, it's all in the same environment-object anyway.
        }
        fetchLexicalThis(lexicalThisState) {
            return ucfg_builders_1.fieldAccess(exports.ENV, lexicalThisState.lastThisBindingName);
        }
    }
})(EnvironmentAllocation = exports.EnvironmentAllocation || (exports.EnvironmentAllocation = {}));
const BINARY_OPERATORS_BUILTINS = (() => {
    const m = new Map();
    const prefix = '__js_';
    `
  * mul
  / div
  % mod
  - sub
  << shift_left
  >> shift_right
  >>> shift_right
  < less_than
  > greater_than
  <= less_or_equal
  >= greater_or_equal
  instanceof instanceof
  in in
  == equal
  != unequal
  === equal
  !== unequal
  & bitwise_and
  ^ bitwise_xor
  | bitwise_or
  `
        .trim()
        .split('\n')
        .forEach(s => {
        const [k, v] = s.trim().split(' ');
        m.set(k, `${prefix}${v}`);
    });
    return m;
})();
/**
 * Maps binary operators to corresponding IDs of built-in functions.
 *
 * Updating assignment operators are excluded.
 *
 * Short-circuiting operators `&&` and `||` are excluded
 * (they generate blocks and jumps, not single instructions).
 */
function getBuiltinNameForBinaryOperator(operator) {
    return BINARY_OPERATORS_BUILTINS.get(operator) || '__unknown_operator';
}
exports.getBuiltinNameForBinaryOperator = getBuiltinNameForBinaryOperator;
//# sourceMappingURL=backend.js.map