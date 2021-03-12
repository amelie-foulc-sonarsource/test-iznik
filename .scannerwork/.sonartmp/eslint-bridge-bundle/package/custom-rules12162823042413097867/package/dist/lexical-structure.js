"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LexicalThisState = exports.alphaRenameIfNecessary = exports.scopeIdToName = exports.hasThisBinding = exports.isEffectiveScope = exports.diagnosticPrettyPrint = exports.analyzeLexicalStructure = exports.RequireOuterScope = exports.RequireNarrowestEnclosingScope = exports.RefGlobalBuiltIn = exports.RefGlobal = exports.RefOuter = exports.RefLocalOnScope = exports.RefLocalOnStack = exports.IdGen = void 0;
var IdGen;
(function (IdGen) {
    /**
     * Creates an ID-generator that generates strings from continuously
     * incremented counters.
     */
    function counterBasedIdGen(initialValue) {
        let counter = initialValue;
        return {
            freshId() {
                const result = String(counter);
                counter++;
                return result;
            },
        };
    }
    IdGen.counterBasedIdGen = counterBasedIdGen;
})(IdGen = exports.IdGen || (exports.IdGen = {}));
/**
 * A scope together with a possibly adjusted name of a variable.
 *
 * The scope is supposed to belong to a node that will be translated
 * into its own UCFG.
 *
 * The modification of variable name might be necessary to avoid
 * collisions, because multiple JS-scopes will have to be merged into
 * a single UCFG (for example, JS block scopes will not generate their
 * own UCFG).
 */
class EffectiveBinding {
    /**
     * @param effectiveScopeName id of the effective scope
     * @param effectiveScope a scope that belongs to an actual UCFG,
     *                       in which the variable can be materialized.
     * @param effectiveName the alpha-renaming of the variable.
     */
    constructor(effectiveScopeId, effectiveScope, effectiveName) {
        this.effectiveScopeId = effectiveScopeId;
        this.effectiveScope = effectiveScope;
        this.effectiveName = effectiveName;
    }
}
/** References a local UCFG variable directly by name. */
class RefLocalOnStack {
    constructor(varName) {
        this.varName = varName;
    }
}
exports.RefLocalOnStack = RefLocalOnStack;
/** References a property of the local scope. */
class RefLocalOnScope {
    constructor(varName, scopeId) {
        this.varName = varName;
        this.scopeId = scopeId;
    }
}
exports.RefLocalOnScope = RefLocalOnScope;
/** References a property from an outer scope in the environment. */
class RefOuter {
    constructor(varName, scopeId) {
        this.varName = varName;
        this.scopeId = scopeId;
    }
}
exports.RefOuter = RefOuter;
/** References a property of the global context, user-defined. */
class RefGlobal {
    constructor(varName) {
        this.varName = varName;
    }
}
exports.RefGlobal = RefGlobal;
/**
 * References a built-in property of the global context,
 * which is assumed to not be overridden by the user.
 *
 * The assumption that it's not overridden by the user is not guaranteed
 * by any language properties, but we assume that it's generally avoided,
 * and that we can make this simplifying assumption to optimize accesses
 * to the global built-in structures.
 */
class RefGlobalBuiltIn {
    constructor(varName) {
        this.varName = varName;
    }
}
exports.RefGlobalBuiltIn = RefGlobalBuiltIn;
class RequireNarrowestEnclosingScope {
    constructor(scope, scopeId) {
        this.scope = scope;
        this.scopeId = scopeId;
    }
}
exports.RequireNarrowestEnclosingScope = RequireNarrowestEnclosingScope;
class RequireOuterScope {
    constructor(scope, scopeId) {
        this.scope = scope;
        this.scopeId = scopeId;
    }
}
exports.RequireOuterScope = RequireOuterScope;
/**
 * A mutable implementation of a `LexicalStructure`.
 *
 * It serves the dual purpose of a mutable builder during the analysis of the
 * lexical structure, as well as actual `LexicalStructure` implementation,
 * which is supposed to be used in read-only manner during the emission of UCFG code.
 */
class LexicalStructureImpl {
    constructor(scopeNameGen) {
        this.scopeNameGen = scopeNameGen;
        /** Cached unique scope IDs. */
        this.scopesToIds = new Map();
        this.idsToScopes = new Map();
        /**
         * Maps every variable to an effective binding (scope in which the variable
         * will be actually materialized, together with a possibly adjusted name under
         * which it will be materialized).
         */
        this.effectiveVariableBinding = new Map();
        /**
         * Maps a scope to the list of effectively bound variables.
         */
        this.effectivelyBoundVariables = new Map();
        /**
         * Maps every scope to the smallest parent scope that contains this scope
         * and belongs to an actual UCFG.
         */
        this.narrowestEffectiveScope = new Map();
        this.isRefBoundInOuterScope = new Map();
        this.isVarReferencedInNestedScope = new Map();
        this.identifiersToReferences = new Map();
        this.identifierToVariable = new Map();
        /**
         * Maps a scope to the required outer scopes that are necessary some
         * of the references within this scope.
         *
         */
        this.outerScopeRequirements = new Map();
        /** Set of scopes required by at least one nested scope. */
        this.scopesRequiredByNestedScopes = new Set();
        this.nodeToScope = new Map();
    }
    getScopeId(sc) {
        const maybeId = this.scopesToIds.get(sc);
        let id;
        if (maybeId) {
            id = maybeId;
        }
        else {
            if (isEffectiveScope(sc)) {
                const node = sc.block;
                id = this.scopeNameGen.freshEffectiveScopeId(node);
            }
            else {
                id = this.scopeNameGen.freshIneffectiveScopeId();
            }
            this.scopesToIds.set(sc, id);
            this.idsToScopes.set(id, sc);
        }
        return id;
    }
    getScopeById(id) {
        return this.idsToScopes.get(id);
    }
    getScopeIdForNode(scopeGeneratingNode) {
        const sc = this.getScopeForNode(scopeGeneratingNode);
        if (sc) {
            return this.getScopeId(sc);
        }
        // Looks like we've forgotten to handle some node type.
        return `!failed_to_obtain_scope_id_for_node_of_type_${scopeGeneratingNode.type}!`;
    }
    setEffectiveVariableBinding(v, effectiveBinding) {
        this.effectiveVariableBinding.set(v, effectiveBinding);
        const maybeBindingsList = this.effectivelyBoundVariables.get(effectiveBinding.effectiveScope);
        let bindingsList;
        if (maybeBindingsList) {
            bindingsList = maybeBindingsList;
        }
        else {
            bindingsList = [];
            this.effectivelyBoundVariables.set(effectiveBinding.effectiveScope, bindingsList);
        }
        bindingsList.push(effectiveBinding);
    }
    /**
     * Attempts to get the effective binding for a variable.
     *
     * Returns `undefined` for the invalidly bound variables in the top-level Program
     * scope (those should be free, not bound anywhere).
     *
     * @param v a variable.
     */
    getEffectiveVariableBinding(v) {
        return this.effectiveVariableBinding.get(v);
    }
    setNarrowestEffectiveScope(scope, effectiveScope) {
        this.narrowestEffectiveScope.set(scope, effectiveScope);
    }
    /**
     * Attempts to get the narrowest effective ascendant scope.
     *
     * If no such scope can be found, return the input itself and caches it in the map.
     *
     * @param scope a (possibly ineffective nested) scope
     */
    getNarrowestEffectiveScope(scope) {
        let nes = this.narrowestEffectiveScope.get(scope);
        /* istanbul ignore if */
        if (!nes) {
            // 1. Should not happen: `setNarrowestEffectiveScope` is among the very
            //   first operations invoked on this builder in `analyzeRec`.
            // 2. Inconsequential:
            //   If it somehow happens after all, the given variables from the problematic
            //   scope will probably not resolve properly, which is not good, but not critical.
            this.narrowestEffectiveScope.set(scope, scope);
            nes = scope;
        }
        return nes;
    }
    /**
     * Attempts to resolve a reference, and if it is bound, then
     *
     *   - save whether it's bound in outer scope, or in the same scope on same level
     *   - if it is bound in outer scope, then set the flag on the resolved variable that
     *     it is referenced at least once from a nested scope (forcing the variable to
     *     be allocated in the scope/activation-record).
     * @param ref
     */
    resolveAndUpdateFlags(ref, possiblyIneffectiveOccurrenceScope) {
        const v = ref.resolved;
        const effectiveOccurrenceScope = this.getNarrowestEffectiveScope(possiblyIneffectiveOccurrenceScope);
        if (v) {
            const effectiveBinding = this.getEffectiveVariableBinding(v);
            if (effectiveBinding) {
                const effectiveBindingScope = effectiveBinding.effectiveScope;
                const isBoundInOuterScope = effectiveBindingScope !== effectiveOccurrenceScope;
                this.isRefBoundInOuterScope.set(ref, isBoundInOuterScope);
                if (isBoundInOuterScope) {
                    this.isVarReferencedInNestedScope.set(v, true);
                }
            }
        }
    }
    resolveReference(ref) {
        return ref.resolved;
    }
    listRefs() {
        return this.identifiersToReferences;
    }
    setReferenceForIdentifier(identifier, reference) {
        this.identifiersToReferences.set(identifier, reference);
    }
    getReferenceForIdentifier(identifier) {
        return this.identifiersToReferences.get(identifier);
    }
    resolveRefInUcfg(identifier) {
        const ref = this.getReferenceForIdentifier(identifier);
        if (!ref) {
            return undefined;
        }
        // Here, we handle the different cases of what a reference can mean:
        //   - references to outer scopes
        //   - references to current scope, with scope-allocated variable
        //   - references to current scope, with stack-allocated variable
        //   - references to global context (presumably user-defined)
        //   - references to global context (presumably built-in)
        const variable = this.resolveReference(ref);
        if (variable) {
            const effectiveBinding = this.getEffectiveVariableBinding(variable);
            if (effectiveBinding) {
                if (this.isBoundInOuterScope(ref)) {
                    return new RefOuter(effectiveBinding.effectiveName, this.getScopeId(effectiveBinding.effectiveScope));
                }
                else if (this.isReferencedInNestedScopes(variable)) {
                    return new RefLocalOnScope(effectiveBinding.effectiveName, this.getScopeId(effectiveBinding.effectiveScope));
                }
                else {
                    return new RefLocalOnStack(effectiveBinding.effectiveName);
                }
            }
            else {
                return new RefGlobalBuiltIn(variable.name);
            }
        }
        else {
            const name = ref.identifier.name;
            // No variable: must be global
            return new RefGlobal(name);
        }
    }
    setVariableForIdentifier(identifier, variable, effectiveBinding) {
        this.identifierToVariable.set(identifier, { variable, effectiveBinding });
    }
    getVariableForIdentifier(identifier) {
        return this.identifierToVariable.get(identifier);
    }
    listVars() {
        return this.identifierToVariable;
    }
    resolveVarInUcfg(identifier) {
        const variableWithBinding = this.getVariableForIdentifier(identifier);
        if (variableWithBinding) {
            const isScopeAllocated = this.isReferencedInNestedScopes(variableWithBinding.variable);
            return { effectiveBinding: variableWithBinding.effectiveBinding, isScopeAllocated };
        }
        return undefined;
    }
    /**
     * Attempts to resolve the variable for a reference,
     * and returns the effective binding of the variable (if any).
     *
     * Can be used once the variable has been assigned to the effectively binding scope.
     * It is not necessary to wait until it is known whether the variable will be
     * allocated on stack or on the activation record.
     */
    getEffectiveReferenceBinding(ref) {
        const v = ref.resolved;
        if (v) {
            return this.getEffectiveVariableBinding(v);
        }
        return undefined;
    }
    isBoundInOuterScope(ref) {
        return Boolean(this.isRefBoundInOuterScope.get(ref));
    }
    isReferencedInNestedScopes(v) {
        return Boolean(this.isVarReferencedInNestedScope.get(v));
    }
    /**
     * Lists the variables effectively bound in this scope
     *
     * @param scope
     */
    listEffectivelyBoundVariables(scope) {
        return this.effectivelyBoundVariables.get(scope) || [];
    }
    setRequiredScopes(scope, outerScopesRequirements) {
        this.outerScopeRequirements.set(scope, outerScopesRequirements);
        // Make sure that all the required scopes know that they are required at least once somewhere.
        for (const req of outerScopesRequirements) {
            this.scopesRequiredByNestedScopes.add(req.scope);
        }
    }
    getRequiredScopes(scope) {
        return this.outerScopeRequirements.get(scope);
    }
    /**
     * Returns `true` if content of a scope is required in any nested scopes.
     *
     * If the outcome is `false`, it means that no activation record has to be allocated
     * for that scope at all.
     *
     * @param scope
     */
    isRequiredByNestedScopes(scope) {
        return this.scopesRequiredByNestedScopes.has(scope);
    }
    setScopeForNode(node, scope) {
        this.nodeToScope.set(node, scope);
    }
    getScopeForNode(node) {
        return this.nodeToScope.get(node);
    }
    getOuterScopeRequirements(ucfgGeneratingNode) {
        const ucfgGeneratingScope = this.getScopeForNode(ucfgGeneratingNode);
        if (ucfgGeneratingScope) {
            return this.getRequiredScopes(ucfgGeneratingScope) || [];
        }
        else {
            return [];
        }
    }
    isScopeMaterialized(node) {
        const sc = this.getScopeForNode(node);
        if (sc) {
            return this.isRequiredByNestedScopes(sc);
        }
        return false;
    }
}
function analyzeRec(currentScope, narrowestEffectiveScope, nestingLevel, lexEnvBuilder) {
    const id = lexEnvBuilder.getScopeId(currentScope);
    const currentIsEffective = isEffectiveScope(currentScope);
    const currentNarrowestEffectiveScope = currentIsEffective
        ? currentScope
        : narrowestEffectiveScope;
    lexEnvBuilder.setNarrowestEffectiveScope(currentScope, currentNarrowestEffectiveScope);
    lexEnvBuilder.setScopeForNode(currentScope.block, currentScope);
    analyzeVariables(currentScope, id, currentNarrowestEffectiveScope, lexEnvBuilder);
    analyzeReferences(currentScope, lexEnvBuilder);
    if (currentIsEffective) {
        analyzeRequirements(currentScope, narrowestEffectiveScope, lexEnvBuilder);
    }
    currentScope.childScopes.forEach(s => analyzeRec(s, currentNarrowestEffectiveScope, nestingLevel + 1, lexEnvBuilder));
}
function analyzeVariables(currentScope, currentScopeId, currentNarrowestEffectiveScope, lexEnvBuilder) {
    const currentIsEffective = isEffectiveScope(currentScope);
    if (currentScope.type === 'global') {
        // Do not create any effective bindings:
        // this outermost synthetic scope
        // will not be transformed into an UCFG.
        // All references where a variable can be resolved, but no
        // effective binding can be found, will be interpreted as global built-ins.
        return;
    }
    for (const v of currentScope.variables) {
        const effectiveName = alphaRenameIfNecessary(currentIsEffective, currentScopeId, v.name);
        const effectiveBinding = new EffectiveBinding(currentScopeId, currentNarrowestEffectiveScope, effectiveName);
        lexEnvBuilder.setEffectiveVariableBinding(v, effectiveBinding);
        v.defs.forEach(varDef => lexEnvBuilder.setVariableForIdentifier(varDef.name, v, effectiveBinding));
    }
}
function analyzeReferences(currentScope, lexEnvBuilder) {
    for (const ref of currentScope.references) {
        lexEnvBuilder.setReferenceForIdentifier(ref.identifier, ref);
        lexEnvBuilder.resolveAndUpdateFlags(ref, currentScope);
    }
}
function analyzeRequirements(currentScope, narrowestEffectiveScope, lexEnvBuilder) {
    var _a;
    const requiredScopes = new Set();
    for (const ref of currentScope.through) {
        const requiredScope = (_a = lexEnvBuilder.getEffectiveReferenceBinding(ref)) === null || _a === void 0 ? void 0 : _a.effectiveScope;
        if (requiredScope) {
            requiredScopes.add(requiredScope);
        }
    }
    const outerScopeRequirements = Array.from(requiredScopes).map(sc => {
        if (sc === narrowestEffectiveScope) {
            return new RequireNarrowestEnclosingScope(sc, lexEnvBuilder.getScopeId(sc));
        }
        else {
            return new RequireOuterScope(sc, lexEnvBuilder.getScopeId(sc));
        }
    });
    lexEnvBuilder.setRequiredScopes(currentScope, outerScopeRequirements);
}
function analyzeLexicalStructure(programScope, scopeNameGen) {
    const bldr = new LexicalStructureImpl(scopeNameGen);
    analyzeRec(programScope, programScope, 0, bldr);
    return bldr;
}
exports.analyzeLexicalStructure = analyzeLexicalStructure;
function diagnosticPrettyPrint(programRootScope, lexicalStructure) {
    const accumulator = [];
    diagnosticPrettyPrintRec(programRootScope, lexicalStructure, 0, accumulator);
    return accumulator.join('\n');
}
exports.diagnosticPrettyPrint = diagnosticPrettyPrint;
/**
 * Checks whether a scope will belong to an actual UCFG or not.
 */
function isEffectiveScope(scope) {
    const typ = scope.block.type;
    // Method definitions include 'constructor'
    return ((typ === 'Program' && scope.type !== 'global') ||
        typ === 'FunctionDeclaration' ||
        typ === 'FunctionExpression' ||
        typ === 'MethodDefinition' ||
        typ === 'ArrowFunctionExpression');
}
exports.isEffectiveScope = isEffectiveScope;
/** Checks whether this scope is effective and also binds `this`. */
function hasThisBinding(scope) {
    // It's just a rough sketch.
    // Consult subsections called "HasThisBinding" in 8.1.1.2 for details
    // https://tc39.es/ecma262/#sec-function-environment-records-hasthisbinding
    // in case this becomes necessary.
    return isEffectiveScope(scope) && scope.block.type !== 'ArrowFunctionExpression';
}
exports.hasThisBinding = hasThisBinding;
function scopeIdToName(id) {
    return `%scope-${id}`;
}
exports.scopeIdToName = scopeIdToName;
function alphaRenameIfNecessary(isNecessary, scopeId, varName) {
    const alphaRenamingSuffix = isNecessary ? '' : `~${scopeId}`;
    const alphaRenamingPrefix = isNecessary ? '' : '%';
    return `${alphaRenamingPrefix}${varName}${alphaRenamingSuffix}`;
}
exports.alphaRenameIfNecessary = alphaRenameIfNecessary;
const INDENTATION_SPACES = 2;
/** Recursive helper that does most of the work of `diagnosticPrettyPrint`. */
function diagnosticPrettyPrintRec(currentScope, lexEnv, nestingLevel, linesAcc) {
    var _a;
    const indentation = ''.padStart(nestingLevel * INDENTATION_SPACES, ' ');
    function appendIndented(str) {
        linesAcc.push(...str.split('\n').map(l => indentation + l));
    }
    const currentNode = currentScope.block;
    const id = lexEnv.getScopeId(currentScope);
    const nodeType = currentScope.block.type;
    const name = String(currentScope.block.type === 'FunctionDeclaration' ? ` ${(_a = currentScope.block.id) === null || _a === void 0 ? void 0 : _a.name}` : '');
    const isEff = isEffectiveScope(currentScope);
    const jsVars = currentScope.type === 'global'
        ? '[...omitted...]'
        : `[${currentScope.variables.map(e => e.name).join(',')}]`;
    const jsRefs = `[${currentScope.references.map(e => e.identifier.name).join(',')}]`;
    const jsThrough = `[${currentScope.through.map(e => e.identifier.name).join(',')}]`;
    const marker = isEff ? '[X]' : '[-]';
    const scopeDescr = `${id}${marker} ${nodeType}${name} vars=${jsVars} refs=${jsRefs} through=${jsThrough}`;
    appendIndented(scopeDescr);
    const isScopeMaterialized = lexEnv.isScopeMaterialized(currentScope.block);
    const effectivelyBoundVars = lexEnv.listEffectivelyBoundVariables(currentScope);
    if (isEff) {
        appendIndented(`| Is scope materialized: ${isScopeMaterialized}`);
        const formattedEffBoundVars = effectivelyBoundVars.map(e => e.effectiveName).join(',');
        appendIndented(`| Effectively bound variables: [${formattedEffBoundVars}]`);
        const formattedReqOuterScopes = lexEnv
            .getOuterScopeRequirements(currentNode)
            .map(e => `${e.scopeId}: ${e instanceof RequireNarrowestEnclosingScope ? 'loc' : '%env'}`)
            .join(',');
        appendIndented(`| Required outer scopes: [${formattedReqOuterScopes}]`);
    }
    appendVariableMappings(currentScope, lexEnv, appendIndented);
    appendReferenceMappings(currentScope, lexEnv, appendIndented);
    for (const childScope of currentScope.childScopes) {
        diagnosticPrettyPrintRec(childScope, lexEnv, nestingLevel + 1, linesAcc);
    }
}
/** Helper function that appends the descriptions of variables to the pretty-printed lex-env structure. */
function appendVariableMappings(currentScope, lexEnv, appendIndented) {
    if (currentScope.variables.length === 0) {
        return;
    }
    appendIndented('| Variable mappings:');
    for (const v of currentScope.variables) {
        for (const varDef of v.defs) {
            const varInUcfg = lexEnv.resolveVarInUcfg(varDef.name);
            /* istanbul ignore else */
            if (varInUcfg) {
                const howToAccess = varInUcfg.isScopeAllocated ? '(scope allocated)' : '(purely local)';
                const effName = varInUcfg.effectiveBinding.effectiveName;
                const scopeId = lexEnv.getScopeId(varInUcfg.effectiveBinding.effectiveScope);
                appendIndented(`|   ${varDef.name.name}: ${effName} in ${scopeId} ${howToAccess}`);
            }
            else {
                // 1. Should not occur: we are iterating over variables, we should be able to resolve them.
                // 2. Irrelevant: it's a pretty printer used only in tests for visual inspection.
            }
        }
    }
}
/** Helper function that appends the descriptions of references to the pretty-printed lex-env structure. */
function appendReferenceMappings(currentScope, lexEnv, appendIndented) {
    if (currentScope.references.length > 0) {
        appendIndented('| Reference mappings:');
        for (const ref of currentScope.references) {
            const identifier = ref.identifier;
            const refInUcfg = lexEnv.resolveRefInUcfg(identifier);
            if (refInUcfg instanceof RefOuter) {
                appendIndented(`|   ${identifier.name}: %env -> ${refInUcfg.scopeId} -> ${refInUcfg.varName}`);
            }
            else if (refInUcfg instanceof RefGlobal) {
                appendIndented(`|   ${identifier.name}: global -> ${refInUcfg.varName}`);
            }
            else if (refInUcfg instanceof RefLocalOnScope) {
                appendIndented(`|   ${identifier.name}: local in scope ${refInUcfg.scopeId} -> ${refInUcfg.varName}`);
            }
            else if (refInUcfg instanceof RefLocalOnStack) {
                appendIndented(`|   ${identifier.name}: local on stack -> ${refInUcfg === null || refInUcfg === void 0 ? void 0 : refInUcfg.varName}`);
            }
            else {
                appendIndented(`|   ${identifier.name}: global built-in`);
            }
        }
    }
}
/**
 * A structure that carries around information that is required to
 * determine how a lexically bound `this` can be accessed.
 *
 * This structure can vary for each visited node, and is therefore separate
 * from the `LexicalStructure` (which remains constant for entire file).
 */
class LexicalThisState {
    constructor(currentLevel, lastThisBindingName) {
        this.currentLevel = currentLevel;
        this.lastThisBindingName = lastThisBindingName;
    }
}
exports.LexicalThisState = LexicalThisState;
//# sourceMappingURL=lexical-structure.js.map