"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = void 0;
exports.rule = {
    create(context) {
        return {
            Program() {
                const scope = context.getScope();
                // As we parse every file with "module" source type, we find user defined global variables in the module scope
                const moduleScope = findModuleScope(context);
                moduleScope === null || moduleScope === void 0 ? void 0 : moduleScope.variables.forEach(variable => {
                    var _a;
                    if (scope.variables.find(global => global.name === variable.name)) {
                        // Avoid reporting on redefinitions of actual global variables
                        return;
                    }
                    for (const def of variable.defs) {
                        const defNode = def.node;
                        if (def.type === 'FunctionName' ||
                            (def.type === 'Variable' && ((_a = def.parent) === null || _a === void 0 ? void 0 : _a.kind) === 'var')) {
                            context.report({
                                node: defNode,
                                message: 'Define this declaration in a local scope or bind explicitly the property to the global object.',
                            });
                            return;
                        }
                    }
                });
            },
        };
    },
};
function findModuleScope(context) {
    return context.getSourceCode().scopeManager.scopes.find(s => s.type === 'module');
}
//# sourceMappingURL=declarations-in-global-scope.js.map