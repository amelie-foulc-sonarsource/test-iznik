import * as pb from './ucfg_pb';
import { BlockBuilder, InstructionBuilder, Expr } from './ucfg-builders';
import * as estree from 'estree';
import { AstElementHandlerContext, AstElementTraversalResults } from './ast-handlers';
/**
 * A purely AST-based rule that knows how to rewrite
 * function call expressions of shape `f(a1, ..., an)`.
 */
export declare type FunctionMacro = (node: estree.CallExpression, argResults: Expr[], blockBuilder: BlockBuilder) => Expr;
/** Attempts to find an appropriate macro based on identifier in the call expression. */
export declare function proposeFunctionMacro(callExpr: estree.CallExpression, ctx: AstElementHandlerContext): FunctionMacro | undefined;
/**
 * A purely AST-based rewriting rule that knows how to
 * rewrite a method call.
 */
export declare type MethodMacro = (node: estree.CallExpression, argResults: Expr[], blockBuilder: BlockBuilder) => Expr;
export declare function proposeMethodMacro(callee: estree.MemberExpression): MethodMacro | undefined;
/**
 * A purely syntax based rewriting rule that knows how to rewrite
 * field accesses `x[y]`.
 *
 * Not applicable to field accesses in lValue position (i.e. not `a.b = c`).
 */
export declare type FieldAccessMacro = (node: estree.MemberExpression, childExpressions: AstElementTraversalResults, builder: InstructionBuilder) => pb.Variable;
export declare function proposeFieldAccessMacro(fieldAccessExpr: estree.MemberExpression): FieldAccessMacro | undefined;
export declare type FieldAssignmentMacro = (node: estree.MemberExpression, memberExprChildResults: AstElementTraversalResults, assignedValue: Expr, builder: InstructionBuilder) => void;
export declare function proposeFieldAssignmentMacro(fieldAccessExpr: estree.MemberExpression): FieldAssignmentMacro | undefined;
