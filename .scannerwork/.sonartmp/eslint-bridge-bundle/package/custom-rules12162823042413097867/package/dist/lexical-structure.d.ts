import { Reference, Scope, Variable } from 'eslint-scope';
import * as estree from 'estree';
/**
 * Describes the lexical structure of a single
 * file in a format that is suitable for generating UCFGs.
 *
 * It provides the following information:
 *
 *   - what scope belongs to a (JS-scope)-generating node
 *   - what is the file-unique ID of a scope
 *   - whether a scope should be materialized or not
 *       (i.e. does it contain any variables that escape into nested scopes)
 *   - where variables should be allocated
 *       (on stack or in the scope-activation-records)
 *   - how to obtain a value referenced by a variable
 *       (local from stack, local from scope, outer scope, global)
 *   - what outer scopes should be added to the environment of a given nested function
 *   - `this`-values of which levels should be added to the environment of a given nested function
 *
 * Once constructed, this structure remains constant throughout the processing of a single file.
 */
export interface LexicalStructure {
    /**
     * Gets a file-unique string identifier of a given scope.
     */
    getScopeId(sc: Scope): string;
    /**
     * Attemts to find a scope given an ID.
     *
     * Intended to be used in tests.
     */
    getScopeById(id: string): Scope | undefined;
    /**
     * Gets the scope that corresponds to a scope-generating node.
     *
     * @param scopeGeneratingNode a node that creates a (JS-)scope
     *                            (e.g. FunctionDeclaration, ArrowFunctionExpression,
     *                             but also blocks etc.)
     */
    getScopeForNode(scopeGeneratingNode: estree.Node): Scope | undefined;
    /**
     * Get the scope-ID that corresponds to a scope-generating node.
     *
     * Composition of `getScopeForNode` followed by `getScopeId`.
     */
    getScopeIdForNode(scopeGeneratingNode: estree.Node): string;
    /**
     * Returns `true` iff the `ucfgGeneratingNode` is a node that
     * is supposed to generate its own UCFG, and if the scope is
     * required in any nested scopes.
     */
    isScopeMaterialized(ucfgGeneratingNode: estree.Node): boolean;
    /**
     * If the `identifier` is a variable reference, returns
     * a description of how the referenced value can be stored and retrieved.
     *
     * @param identifier an identifier in variable reference position.
     */
    resolveRefInUcfg(identifier: estree.Identifier): RefInUcfg | undefined;
    /**
     * If the `identifier` is a variable binder, returns
     * a description of how the bound value can be stored and retrieved.
     *
     * @param identifier an identifier in variable binder position.
     */
    resolveVarInUcfg(identifier: estree.Identifier): VarInUcfg | undefined;
    /**
     * Lists the required outer scopes (sans `global`), together with
     * descriptions where those can be found (scopes can appear either
     * as local variables or as properties of `%env`).
     *
     * @param node a node that generates its own UCFG.
     */
    getOuterScopeRequirements(ucfgGeneratingNode: estree.Node): OuterScopeRequirement[];
    /**
     * Lists effectively bound variables.
     *
     * Mostly for diagnostic purposes.
     */
    listEffectivelyBoundVariables(scope: Scope): EffectiveBinding[];
    /**
     * Returns the map of identifiers to references (for tests).
     */
    listRefs(): Map<estree.Identifier, Reference>;
    /**
     * Returns the map of identifiers to variable binders (for tests).
     */
    listVars(): Map<estree.Identifier, VariableWithBinding>;
}
/**
 * A strategy for generating a fresh unique id on each invocation.
 */
export interface IdGen {
    freshId(): string;
}
export declare namespace IdGen {
    /**
     * Creates an ID-generator that generates strings from continuously
     * incremented counters.
     */
    function counterBasedIdGen(initialValue: number): IdGen;
}
/**
 * A source of fresh IDs for scopes.
 *
 * The IDs are supposed to be usable inside of renamed variable names,
 * they are not supposed to be the names of helper variables.
 */
export interface ScopeNameGen {
    /**
     * Generates an ID for nameless block-scopes.
     */
    freshIneffectiveScopeId(): string;
    /**
     * Generates an ID for scopes that correspond to UCFG-generating nodes.
     *
     * The actual implementations will typically make the generated name
     * related to that of the generated UCFG.
     *
     * @param node function or program that generates an UCFG.
     */
    freshEffectiveScopeId(node: estree.Node): string;
}
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
declare class EffectiveBinding {
    effectiveScopeId: string;
    effectiveScope: Scope;
    effectiveName: string;
    /**
     * @param effectiveScopeName id of the effective scope
     * @param effectiveScope a scope that belongs to an actual UCFG,
     *                       in which the variable can be materialized.
     * @param effectiveName the alpha-renaming of the variable.
     */
    constructor(effectiveScopeId: string, effectiveScope: Scope, effectiveName: string);
}
declare type VariableWithBinding = {
    variable: Variable;
    effectiveBinding: EffectiveBinding;
};
/** References a local UCFG variable directly by name. */
export declare class RefLocalOnStack {
    varName: string;
    constructor(varName: string);
}
/** References a property of the local scope. */
export declare class RefLocalOnScope {
    varName: string;
    scopeId: string;
    constructor(varName: string, scopeId: string);
}
/** References a property from an outer scope in the environment. */
export declare class RefOuter {
    varName: string;
    scopeId: string;
    constructor(varName: string, scopeId: string);
}
/** References a property of the global context, user-defined. */
export declare class RefGlobal {
    varName: string;
    constructor(varName: string);
}
/**
 * References a built-in property of the global context,
 * which is assumed to not be overridden by the user.
 *
 * The assumption that it's not overridden by the user is not guaranteed
 * by any language properties, but we assume that it's generally avoided,
 * and that we can make this simplifying assumption to optimize accesses
 * to the global built-in structures.
 */
export declare class RefGlobalBuiltIn {
    varName: string;
    constructor(varName: string);
}
/** Various ways for a variable reference to be translated in UCFG. */
export declare type RefInUcfg = RefLocalOnStack | RefLocalOnScope | RefOuter | RefGlobal | RefGlobalBuiltIn;
export declare type VarInUcfg = {
    effectiveBinding: EffectiveBinding;
    isScopeAllocated: boolean;
};
export declare class RequireNarrowestEnclosingScope {
    scope: Scope;
    scopeId: string;
    constructor(scope: Scope, scopeId: string);
}
export declare class RequireOuterScope {
    scope: Scope;
    scopeId: string;
    constructor(scope: Scope, scopeId: string);
}
/**
 * Reference to a required outer scope, together with a hint about where
 * to get it:
 *
 * - if the narrowest enclosing scope is required directly in a nested scope, then
 *   it can be fetched from a local variable on the stack, and put into the environment.
 * - if a scope is required that is further out, then it will have to be copied over
 *   (or otherwise made available) from the `%env` passed from above.
 */
export declare type OuterScopeRequirement = RequireNarrowestEnclosingScope | RequireOuterScope;
export declare function analyzeLexicalStructure(programScope: Scope, scopeNameGen: ScopeNameGen): LexicalStructure;
export declare function diagnosticPrettyPrint(programRootScope: Scope, lexicalStructure: LexicalStructure): string;
/**
 * Checks whether a scope will belong to an actual UCFG or not.
 */
export declare function isEffectiveScope(scope: Scope): boolean;
/** Checks whether this scope is effective and also binds `this`. */
export declare function hasThisBinding(scope: Scope): boolean;
export declare function scopeIdToName(id: string): string;
export declare function alphaRenameIfNecessary(isNecessary: boolean, scopeId: string, varName: string): string;
/**
 * A structure that carries around information that is required to
 * determine how a lexically bound `this` can be accessed.
 *
 * This structure can vary for each visited node, and is therefore separate
 * from the `LexicalStructure` (which remains constant for entire file).
 */
export declare class LexicalThisState {
    readonly currentLevel: number;
    readonly lastThisBindingName: string;
    constructor(currentLevel: number, lastThisBindingName: string);
}
export {};
