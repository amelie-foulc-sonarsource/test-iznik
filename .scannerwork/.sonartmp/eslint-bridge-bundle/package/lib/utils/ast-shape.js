"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReferenceTo = exports.isElementWrite = exports.isLiteral = exports.isFunctionNode = exports.isModuleExports = exports.isDefaultSpecifier = exports.isNamespaceSpecifier = exports.isMethodInvocation = exports.isRequireModule = exports.isArrayExpression = exports.isUnaryExpression = exports.isMemberExpression = exports.isMemberWithProperty = exports.isIdentifier = exports.functionLike = exports.FUNCTION_NODES = void 0;
exports.FUNCTION_NODES = [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
];
exports.functionLike = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'MethodDefinition',
]);
function isIdentifier(node, ...values) {
    return node.type === 'Identifier' && values.some(value => value === node.name);
}
exports.isIdentifier = isIdentifier;
function isMemberWithProperty(node, ...values) {
    return node.type === 'MemberExpression' && isIdentifier(node.property, ...values);
}
exports.isMemberWithProperty = isMemberWithProperty;
function isMemberExpression(node, objectValue, ...propertyValue) {
    if (node.type === 'MemberExpression') {
        const { object, property } = node;
        if (isIdentifier(object, objectValue) && isIdentifier(property, ...propertyValue)) {
            return true;
        }
    }
    return false;
}
exports.isMemberExpression = isMemberExpression;
function isUnaryExpression(node) {
    return node !== undefined && node.type === 'UnaryExpression';
}
exports.isUnaryExpression = isUnaryExpression;
function isArrayExpression(node) {
    return node !== undefined && node.type === 'ArrayExpression';
}
exports.isArrayExpression = isArrayExpression;
function isRequireModule(node, ...moduleNames) {
    if (isIdentifier(node.callee, 'require') && node.arguments.length === 1) {
        const argument = node.arguments[0];
        if (argument.type === 'Literal') {
            return moduleNames.includes(String(argument.value));
        }
    }
    return false;
}
exports.isRequireModule = isRequireModule;
function isMethodInvocation(callExpression, objectIdentifierName, methodName, minArgs) {
    return (callExpression.callee.type === 'MemberExpression' &&
        isIdentifier(callExpression.callee.object, objectIdentifierName) &&
        isIdentifier(callExpression.callee.property, methodName) &&
        callExpression.callee.property.type === 'Identifier' &&
        callExpression.arguments.length >= minArgs);
}
exports.isMethodInvocation = isMethodInvocation;
function isNamespaceSpecifier(importDeclaration, name) {
    return importDeclaration.specifiers.some(({ type, local }) => type === 'ImportNamespaceSpecifier' && local.name === name);
}
exports.isNamespaceSpecifier = isNamespaceSpecifier;
function isDefaultSpecifier(importDeclaration, name) {
    return importDeclaration.specifiers.some(({ type, local }) => type === 'ImportDefaultSpecifier' && local.name === name);
}
exports.isDefaultSpecifier = isDefaultSpecifier;
function isModuleExports(node) {
    return (node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.object.name === 'module' &&
        node.property.type === 'Identifier' &&
        node.property.name === 'exports');
}
exports.isModuleExports = isModuleExports;
function isFunctionNode(node) {
    return exports.FUNCTION_NODES.includes(node.type);
}
exports.isFunctionNode = isFunctionNode;
// we have similar function in eslint-plugin-sonarjs, however this one accepts null
// eventually we should update eslint-plugin-sonarjs
function isLiteral(n) {
    return n != null && n.type === 'Literal';
}
exports.isLiteral = isLiteral;
/**
 * Detect expression statements like the following:
 *  myArray[1] = 42;
 *  myArray[1] += 42;
 *  myObj.prop1 = 3;
 *  myObj.prop1 += 3;
 */
function isElementWrite(statement, ref) {
    if (statement.expression.type === 'AssignmentExpression') {
        const assignmentExpression = statement.expression;
        const lhs = assignmentExpression.left;
        return isMemberExpressionReference(lhs, ref);
    }
    return false;
}
exports.isElementWrite = isElementWrite;
function isMemberExpressionReference(lhs, ref) {
    return (lhs.type === 'MemberExpression' &&
        (isReferenceTo(ref, lhs.object) || isMemberExpressionReference(lhs.object, ref)));
}
function isReferenceTo(ref, node) {
    return node.type === 'Identifier' && node === ref.identifier;
}
exports.isReferenceTo = isReferenceTo;
//# sourceMappingURL=ast-shape.js.map