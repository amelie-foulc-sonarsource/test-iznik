"use strict";
/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://jira.sonarsource.com/browse/RSPEC-2819
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = void 0;
const utils_1 = require("../utils");
const MESSAGE = 'Make sure this cross-domain message is being sent to the intended domain.';
const POST_MESSAGE = 'postMessage';
exports.rule = {
    create(context) {
        const services = context.parserServices;
        if (!utils_1.isRequiredParserServices(services)) {
            return {};
        }
        return {
            CallExpression: (node) => {
                var _a;
                const callExpression = node;
                const { callee } = callExpression;
                // Window.postMessage() can take 2 or 3 arguments
                if (![2, 3].includes(callExpression.arguments.length) ||
                    ((_a = utils_1.getValueOfExpression(context, callExpression.arguments[1], 'Literal')) === null || _a === void 0 ? void 0 : _a.value) !== '*') {
                    return;
                }
                if (callee.type === 'Identifier' && callee.name === POST_MESSAGE) {
                    context.report({
                        node: callee,
                        message: MESSAGE,
                    });
                }
                if (callee.type !== 'MemberExpression' || !utils_1.isIdentifier(callee.property, POST_MESSAGE)) {
                    return;
                }
                const { object } = callee;
                const type = utils_1.getTypeAsString(object, services);
                const hasWindowName = WindowNameVisitor.containsWindowName(object, context);
                if (type.match(/window/i) || type.match(/globalThis/i) || hasWindowName) {
                    context.report({
                        node: callee,
                        message: MESSAGE,
                    });
                }
            },
        };
    },
};
class WindowNameVisitor {
    constructor() {
        this.hasWindowName = false;
    }
    static containsWindowName(node, context) {
        const visitor = new WindowNameVisitor();
        visitor.visit(node, context);
        return visitor.hasWindowName;
    }
    visit(root, context) {
        const visitNode = (node) => {
            if (node.type === 'Identifier' && node.name.match(/window/i)) {
                this.hasWindowName = true;
            }
            utils_1.childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitNode);
        };
        visitNode(root);
    }
}
//# sourceMappingURL=post-message.js.map