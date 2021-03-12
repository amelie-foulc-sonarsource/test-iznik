"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClassDeclaration = void 0;
const ast_handlers_1 = require("./ast-handlers");
const ucfg_builders_1 = require("./ucfg-builders");
function handleClassDeclaration(node, _ucfgBuilder, blockBuilder, _childResults, _ctx) {
    var _a;
    const classDecl = node;
    // Stub; Requires support for ES6-classes.
    // Currently simply returns the name in a `ClassExpressionTraversalResult`,
    // so that the name can be used for export clauses.
    return ast_handlers_1.classExpressionResult(blockBuilder.ensureStoredInVariable(ucfg_builders_1._undefined()), (_a = classDecl.id) === null || _a === void 0 ? void 0 : _a.name);
}
exports.handleClassDeclaration = handleClassDeclaration;
//# sourceMappingURL=classes.js.map