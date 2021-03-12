"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFromFunctionReference = exports.getPropertyWithValue = exports.getObjectExpressionProperty = exports.resolveIdentifiers = exports.flattenArgs = exports.getVariableFromName = exports.getLhsVariable = exports.getValueOfExpression = exports.getUniqueWriteUsageOrNode = exports.getUniqueWriteUsage = void 0;
const collections_1 = require("./collections");
const ast_shape_1 = require("./ast-shape");
function getUniqueWriteUsage(context, name) {
    const variable = getVariableFromName(context, name);
    if (variable) {
        const writeReferences = variable.references.filter(reference => reference.isWrite());
        if (writeReferences.length === 1 && writeReferences[0].writeExpr) {
            return writeReferences[0].writeExpr;
        }
    }
    return undefined;
}
exports.getUniqueWriteUsage = getUniqueWriteUsage;
function getUniqueWriteUsageOrNode(context, node) {
    if (node.type === 'Identifier') {
        return getUniqueWriteUsage(context, node.name) || node;
    }
    else {
        return node;
    }
}
exports.getUniqueWriteUsageOrNode = getUniqueWriteUsageOrNode;
function getValueOfExpression(context, expr, type) {
    if (!expr) {
        return undefined;
    }
    if (expr.type === 'Identifier') {
        const usage = getUniqueWriteUsage(context, expr.name);
        if (usage && isNodeType(usage, type)) {
            return usage;
        }
    }
    if (isNodeType(expr, type)) {
        return expr;
    }
    return undefined;
}
exports.getValueOfExpression = getValueOfExpression;
// see https://stackoverflow.com/questions/64262105/narrowing-return-value-of-function-based-on-argument
function isNodeType(node, type) {
    return node.type === type;
}
/**
 * for `x = 42` or `let x = 42` when visiting '42' returns 'x' variable
 */
function getLhsVariable(context) {
    const parent = context.getAncestors()[context.getAncestors().length - 1];
    let formIdentifier;
    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        formIdentifier = parent.id;
    }
    else if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
        formIdentifier = parent.left;
    }
    if (formIdentifier) {
        return getVariableFromName(context, formIdentifier.name);
    }
    return undefined;
}
exports.getLhsVariable = getLhsVariable;
function getVariableFromName(context, name) {
    let scope = context.getScope();
    let variable;
    while (variable == null && scope != null) {
        variable = scope.variables.find(value => value.name === name);
        scope = scope.upper;
    }
    return variable;
}
exports.getVariableFromName = getVariableFromName;
/**
 * Takes array of arguments. Keeps following variable definitions
 * and unpacking arrays as long as possible. Returns flattened
 * array with all collected nodes.
 *
 * A usage example should clarify why this might be useful.
 * According to ExpressJs `app.use` spec, the arguments can be:
 *
 * - A middleware function.
 * - A series of middleware functions (separated by commas).
 * - An array of middleware functions.
 * - A combination of all of the above.
 *
 * This means that methods like `app.use` accept variable arguments,
 * but also arrays, or combinations thereof. This methods helps
 * to flatten out such complicated composed argument lists.
 */
function flattenArgs(context, args) {
    // Invokes `getUniqueWriteUsageOrNode` at most once, from then on
    // only flattens arrays.
    function recHelper(nodePossiblyIdentifier) {
        const n = getUniqueWriteUsageOrNode(context, nodePossiblyIdentifier);
        if (n.type === 'ArrayExpression') {
            return collections_1.flatMap(n.elements, recHelper);
        }
        else {
            return [n];
        }
    }
    return collections_1.flatMap(args, recHelper);
}
exports.flattenArgs = flattenArgs;
function resolveIdentifiers(node, acceptShorthand = false) {
    const identifiers = [];
    resolveIdentifiersAcc(node, identifiers, acceptShorthand);
    return identifiers;
}
exports.resolveIdentifiers = resolveIdentifiers;
function resolveIdentifiersAcc(node, identifiers, acceptShorthand) {
    if (!node) {
        return;
    }
    switch (node.type) {
        case 'Identifier':
            identifiers.push(node);
            break;
        case 'ObjectPattern':
            node.properties.forEach(prop => resolveIdentifiersAcc(prop, identifiers, acceptShorthand));
            break;
        case 'ArrayPattern':
            node.elements.forEach(elem => elem && resolveIdentifiersAcc(elem, identifiers, acceptShorthand));
            break;
        case 'Property':
            if (acceptShorthand || !node.shorthand) {
                resolveIdentifiersAcc(node.value, identifiers, acceptShorthand);
            }
            break;
        case 'RestElement':
            resolveIdentifiersAcc(node.argument, identifiers, acceptShorthand);
            break;
        case 'AssignmentPattern':
            resolveIdentifiersAcc(node.left, identifiers, acceptShorthand);
            break;
        case 'TSParameterProperty':
            resolveIdentifiersAcc(node.parameter, identifiers, acceptShorthand);
            break;
    }
}
function getObjectExpressionProperty(node, propertyKey) {
    if ((node === null || node === void 0 ? void 0 : node.type) === 'ObjectExpression') {
        const properties = node.properties.filter(p => p.type === 'Property' &&
            (ast_shape_1.isIdentifier(p.key, propertyKey) || (ast_shape_1.isLiteral(p.key) && p.key.value === propertyKey)));
        // if property is duplicated, we return the last defined
        return properties[properties.length - 1];
    }
    return undefined;
}
exports.getObjectExpressionProperty = getObjectExpressionProperty;
function getPropertyWithValue(context, objectExpression, propertyName, propertyValue) {
    const maybeProperty = getObjectExpressionProperty(objectExpression, propertyName);
    if (maybeProperty) {
        const maybePropertyValue = getValueOfExpression(context, maybeProperty.value, 'Literal');
        if ((maybePropertyValue === null || maybePropertyValue === void 0 ? void 0 : maybePropertyValue.value) === propertyValue) {
            return maybeProperty;
        }
    }
    return undefined;
}
exports.getPropertyWithValue = getPropertyWithValue;
function resolveFromFunctionReference(context, functionIdentifier) {
    const reference = context
        .getScope()
        .references.find(ref => ref.identifier === functionIdentifier);
    if (reference &&
        reference.resolved &&
        reference.resolved.defs.length === 1 &&
        reference.resolved.defs[0] &&
        reference.resolved.defs[0].type === 'FunctionName') {
        return reference.resolved.defs[0].node;
    }
    return null;
}
exports.resolveFromFunctionReference = resolveFromFunctionReference;
//# sourceMappingURL=node-extractors.js.map