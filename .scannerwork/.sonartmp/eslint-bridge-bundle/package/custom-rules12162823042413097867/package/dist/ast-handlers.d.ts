import * as pb from './ucfg_pb';
import * as estree from 'estree';
import { BlockBuilder, Expr, InstructionBuilder, LValue, UcfgBuilder } from './ucfg-builders';
import { EnvironmentAllocation } from './backend';
import { IdGen, LexicalStructure, LexicalThisState } from './lexical-structure';
import { Rule } from 'eslint';
export declare type ExpressionTraversalResult = {
    type: 'expression';
    expression: Expr;
};
export declare type MemberExpressionTraversalResult = {
    type: 'memberExpression';
    emitFetch: EmitMemberFetch;
    emitWrite: EmitMemberWrite;
};
export declare type FunctionExpressionTraversalResult = {
    type: 'functionExpression';
    ucfgId: string;
    functionValueVbl: pb.Variable;
    name: string | undefined;
};
/**
 * Results for either class expressions or class declarations.
 *
 * Since expressions can also be named, it seemed reasonable to combine
 * them with declarations, because the both entities can carry basically
 * the same information, differring only by their context.
 */
export declare type ClassExpressionTraversalResult = {
    type: 'classExpression';
    classValueVbl: pb.Variable;
    name: string | undefined;
};
/**
 * The `x as y`-part in export clauses like `export {x as y} from 'z';`.
 *
 * Despite same syntax, `x` can have vastly different meanings in different
 * contexts.
 *
 *   - inside of `export { x as y } from 'z'`, the `x` is a property of an external module.
 *   - inside of `export { x as y }`, the `x` is a local variable, that must be resolved
 *     according to the rules for variable scoping.
 *
 * This is why the `local` is exported twice, in two different formats:
 *
 *   - once as a string-typed property name
 *   - another time as a variable
 */
export declare type ExportSpecifierTraversalResult = {
    type: 'ExportSpecifier';
    localExpr: Expr;
    localName: string;
    exportedName: string;
};
/**
 * A result of processing an identifier.
 *
 * An identifier can be used for both writing and reading values,
 * so it includes an `lValue`. Furthermore, identifiers appear
 * as property names, therefore we also save the original name.
 */
export declare type IdentifierTraversalResult = {
    type: 'identifier';
    name: string;
    lValue: LValue;
};
/**
 * Traversal results of default import specifiers, such as `d` in `import d from 'z'`.
 *
 * The local name is a binder, thus we need the `lValue` of it.
 */
export declare type ImportDefaultSpecifierTraversalResult = {
    type: 'ImportDefaultSpecifier';
    local: IdentifierTraversalResult;
};
/**
 * Traversal results of import specifiers of shape `* as local` in `import * as local from 'z'`.
 */
export declare type ImportNamespaceSpecifierTraversalResult = {
    type: 'ImportNamespaceSpecifier';
    local: IdentifierTraversalResult;
};
/**
 * Traversal results for specifiers of shape `x as y` from `import { x as y } from 'z'`.
 *
 * Note that the apparent asymmetry between the imported name (`x`) and the
 * local name (`y`):
 *   - the imported name `x` is really just a string valued property name of the imported module
 *   - the local name `y` is a binder; it can be represented differently dependening
 *     on scopes in which it appears.
 */
export declare type ImportSpecifierTraversalResult = {
    type: 'ImportSpecifier';
    imported: string;
    local: IdentifierTraversalResult;
};
export declare type ObjectPatternTraversalResult = {
    type: 'objectPattern';
    properties: AstElementTraversalResult[];
};
export declare type PropertyPatternTraversalResult = {
    type: 'propertyPattern';
    key: Expr;
    pattern: AstElementTraversalResult;
};
export declare type PropertyTraversalResult = {
    type: 'Property';
    key: Expr;
    value: Expr;
};
/**
 * Result of traversing declarations like
 *
 * `const x = 42;`
 *
 * where the left hand side can potentially be a more complex pattern.
 *
 * If the left hand side is a single identifier, then it should be
 * stored as the `exportableName`.
 */
export declare type VariableDeclaratorTraversalResult = {
    type: 'VariableDeclarator';
    exportableName: string | undefined;
    value: Expr;
};
/**
 * List of declarators with exportable names.
 */
export declare type VariableDeclarationTraversalResult = {
    type: 'VariableDeclaration';
    exportableDeclarators: {
        exportableName: string;
        value: Expr;
    }[];
};
export declare type UndefinedTraversalResult = {
    type: 'undefined';
};
export declare type AstElementTraversalResult = ClassExpressionTraversalResult | ExportSpecifierTraversalResult | ExpressionTraversalResult | FunctionExpressionTraversalResult | IdentifierTraversalResult | ImportDefaultSpecifierTraversalResult | ImportNamespaceSpecifierTraversalResult | ImportSpecifierTraversalResult | MemberExpressionTraversalResult | ObjectPatternTraversalResult | PropertyPatternTraversalResult | PropertyTraversalResult | VariableDeclarationTraversalResult | VariableDeclaratorTraversalResult | UndefinedTraversalResult;
export declare function classExpressionResult(classValueVbl: pb.Variable, className?: string): AstElementTraversalResult;
/**
 * Factory method for `AstElementTraversalResult`s that wrap an expression.
 */
export declare function expressionResult(expression: Expr): AstElementTraversalResult;
export declare function exportSpecifierResult(localName: string, exportedName: string, localExpr: Expr): AstElementTraversalResult;
/**
 * Factory method for `AstElementTraversalResult`s that wrap an identifier.
 *
 * @param name the original name of the identifier (for properties)
 * @param lValue identifier interpreted as a readable/writable variable reference
 */
export declare function identifierResult(name: string, lValue: LValue): AstElementTraversalResult;
export declare function importSpecifierResult(local: IdentifierTraversalResult, imported: string): AstElementTraversalResult;
export declare function importNamespaceSpecifierResult(local: IdentifierTraversalResult): AstElementTraversalResult;
export declare function importDefaultSpecifierResult(local: IdentifierTraversalResult): AstElementTraversalResult;
export declare type EmitMemberFetch = () => {
    implicitThis: Expr;
    fetchedValue: LValue;
};
export declare type EmitMemberWrite = (storedValue: Expr, builder: InstructionBuilder) => void;
/**
 * Factory method for the
 * "property fetch" = "member expression" = "member access" results,
 * like `a['b']` or `a.b`.
 */
export declare function memberExpressionResult(emitFetch: EmitMemberFetch, emitWrite: EmitMemberWrite): MemberExpressionTraversalResult;
export declare function functionExpressionResult(ucfgId: string, functionValueVbl: pb.Variable, name?: string): FunctionExpressionTraversalResult;
export declare function objectPatternResult(properties: AstElementTraversalResult[]): ObjectPatternTraversalResult;
export declare function propertyPatternResult(key: Expr, pattern: AstElementTraversalResult): PropertyPatternTraversalResult;
export declare function propertyResult(key: Expr, value: Expr): PropertyTraversalResult;
/**
 * Factory method for `VariableDeclaratorTraversalResult`s.
 *
 * Invocations should provide an `exportableName` in cases where the left hand side is not a pattern.
 */
export declare function variableDeclaratorResult(value: Expr, exportableName?: string): AstElementTraversalResult;
/**
 * Factory method for `VariableDeclarationTraversalResult`s
 *
 * Filters and stores only those declarators that have a definite name.
 */
export declare function variableDeclarationResult(exportableDeclarators: {
    exportableName: string | undefined;
    value: Expr;
}[]): AstElementTraversalResult;
/**
 * Factory method for `AstElementTraversalResult`s that are `undefined`.
 *
 * Special result that corresponds to an `undefined` value.
 * Used either where no result is expected / needed, or to signal that
 * a handler was not implemented (and the default `undefinedHandler` has been
 * used instead).
 */
export declare function undefinedResult(): AstElementTraversalResult;
/**
 * Initial part of AST element handling.
 *
 * It has access to node itself and to the current builders, but
 * not to the results returned by child AST elements.
 *
 */
export declare type AstElementHandler = (node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, context: AstElementHandlerContext) => AstElementExitHandler;
export interface AstElementHandlerContext {
    envAllocationStrategy: EnvironmentAllocation.EnvironmentAllocationStrategy;
    lexicalStructure: LexicalStructure;
    lexicalThisState: LexicalThisState;
    includePreamble: boolean;
    generatedUcfgBuilders: UcfgBuilder[];
    idGen: IdGen;
    ruleContext: Rule.RuleContext;
    resolveModule: (module: string) => string | undefined;
}
/**
 * Objects of this type contains all results returned by child nodes.
 *
 * Each child node is mapped to the corresponding result.
 */
export declare type AstElementTraversalResults = Map<estree.Node, AstElementTraversalResult>;
export declare function extractResultForNode(results: AstElementTraversalResults, node: estree.Node): AstElementTraversalResult;
export declare function extractResultForNodes(results: AstElementTraversalResults, nodes: estree.Node[]): AstElementTraversalResult[];
/**
 * Final part of AST element handling that is invoked on exit from a node.
 */
export declare type AstElementExitHandler = (childReturns: AstElementTraversalResults) => AstElementTraversalResult;
export declare type AstElementHandlers = {
    [key: string]: AstElementHandler;
};
/** A default handler that does nothing and always returns `undefined`. */
export declare const defaultHandler: AstElementHandler;
/** A warning handler that emits a warning for every unhandled type of AST elements. */
export declare const missingImplementationHandler: AstElementHandler;
/**
 * Convenience factory for simple handlers that
 * can do everything on exit,
 * and don't need to do anything on entry.
 */
export declare function onExit(doAllAtOnceOnExit: (node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, childReturns: AstElementTraversalResults, context: AstElementHandlerContext) => AstElementTraversalResult): AstElementHandler;
/** Converts all child-results to `Expr`s. */
export declare function resultsToExpressions(results: AstElementTraversalResult[]): Expr[];
export declare function resultToExpression(r: AstElementTraversalResult): Expr;
