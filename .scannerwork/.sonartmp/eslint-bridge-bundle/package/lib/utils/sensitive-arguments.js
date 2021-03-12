"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSensitiveCall = void 0;
const node_extractors_1 = require("./node-extractors");
const secondary_locations_1 = require("./secondary-locations");
function checkSensitiveCall(context, callExpression, sensitiveArgumentIndex, sensitiveProperty, sensitivePropertyValue, message) {
    if (callExpression.arguments.length < sensitiveArgumentIndex + 1) {
        return;
    }
    const sensitiveArgument = callExpression.arguments[sensitiveArgumentIndex];
    const options = node_extractors_1.getValueOfExpression(context, sensitiveArgument, 'ObjectExpression');
    if (!options) {
        return;
    }
    const unsafeProperty = node_extractors_1.getPropertyWithValue(context, options, sensitiveProperty, sensitivePropertyValue);
    if (unsafeProperty) {
        context.report({
            node: callExpression.callee,
            message: secondary_locations_1.toEncodedMessage(message, [unsafeProperty]),
        });
    }
}
exports.checkSensitiveCall = checkSensitiveCall;
//# sourceMappingURL=sensitive-arguments.js.map