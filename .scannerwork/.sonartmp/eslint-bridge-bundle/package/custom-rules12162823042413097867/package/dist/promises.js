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
exports.promise = void 0;
const ucfg_id_1 = require("./ucfg-id");
const ucfg_builders_1 = require("./ucfg-builders");
const backend = __importStar(require("./backend"));
const RESULT_FIELD_NAME = '%result%';
/**
 * Returns a Promise object with a `then` function and an internal result.
 *
 */
function promise(node, result, ucfgBuilder, blockBuilder, context) {
    // Create a UCFG builder for the `then` function
    const thenUcfgId = ucfg_id_1.defaultUcfgId(context.ruleContext.getFilename(), process.cwd(), node, `promise_then_${context.idGen.freshId()}`);
    const onFulfilledVar = ucfg_builders_1.vbl('onFulfilled');
    const thenUcfgBuilder = ucfg_builders_1.beginUcfg(thenUcfgId, ucfg_builders_1._this(), [ucfg_builders_1.vbl(backend.ENV), onFulfilledVar], node.loc, {
        ucfgBuilder,
        blockBuilder,
    });
    context.generatedUcfgBuilders.push(thenUcfgBuilder);
    // Generate the block of the `then` UCFG, which consists of
    // calling the `onFulfilled` callback with the promise result
    const thenBlockBuilder = thenUcfgBuilder.beginEntryBlock(`t_${context.idGen.freshId()}`, node.loc);
    const promiseResultVar = thenBlockBuilder.expr(ucfg_builders_1.fieldAccess(ucfg_builders_1._this(), RESULT_FIELD_NAME), undefined, node.loc);
    const env = context.envAllocationStrategy.fetchEnvironmentFromClosure(onFulfilledVar, blockBuilder);
    const res = backend.callFunction(onFulfilledVar, [env, promiseResultVar], thenUcfgBuilder, thenBlockBuilder, node.loc);
    thenBlockBuilder.ret(res);
    const thenFunVar = backend.declareFunction(thenUcfgId, blockBuilder);
    // Create a Promise object
    const promiseVar = blockBuilder.expr(blockBuilder.newObject('Object'));
    blockBuilder.assignExpr(ucfg_builders_1.fieldAccess(promiseVar, 'then'), thenFunVar);
    blockBuilder.assignExpr(ucfg_builders_1.fieldAccess(promiseVar, RESULT_FIELD_NAME), result);
    return promiseVar;
}
exports.promise = promise;
//# sourceMappingURL=promises.js.map