import * as pb from './ucfg_pb';
import { UcfgBuilder, BlockBuilder, Loc, InstructionBuilder, Expr, LValue } from './ucfg-builders';
import { LexicalThisState } from './lexical-structure';
export declare const IMPORT_DEFAULT = "__importDefault";
/**
 * Name for both the second synthetic variable of every method, as well
 * as for the property of function objects that hold the environment of the
 * closure.
 */
export declare const ENV = "%env";
/**
 * Name of the env-property that stores the value of lexically bound `this`.
 */
export declare const THIS = "_this";
/**
 * Handles function calls of shape `f(x1, ..., xn)` where `f` is not a member
 * expression (and thus does not provide an implicit `this`).
 */
export declare function callFunction(callee: Expr, argExprs: Expr[], ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, loc?: Loc): pb.Variable;
/**
 * Handles method calls of shape `objExpr.methodName(a1, ..., aN)`.
 */
export declare function callMethod(lookedUpMethod: LValue, receiverThis: Expr, argExprs: Expr[], blockBuilder: BlockBuilder, loc?: Loc): pb.Variable;
/**
 * Returns a variable that refers to the `global`-context of the current UCFG.
 *
 * Creates the variable once, if necessary.
 */
export declare function globalContext(ucfgBuilder: UcfgBuilder, blockBuilder: InstructionBuilder): pb.Variable;
/**
 * Returns a variable that refers to the global built-ins (coming from stub system).
 *
 * Creates the variable once, if necessary.
 */
export declare function globalContextBuiltins(ucfgBuilder: UcfgBuilder, blockBuilder: InstructionBuilder): pb.Variable;
/**
 * Sets up a JS string literal (with all required prototypes).
 */
export declare function stringLiteral(s: string, _builder: InstructionBuilder): Expr;
/**
 * Instantiates a JS integer literal (with all required prototypes).
 */
export declare function intLiteral(n: number, _blockBuilder: BlockBuilder): Expr;
/** Invokes a magic UCFG-method that converts a string literal into a FunctionReferenceSymbol. */
export declare function declareFunction(ucfgId: string, blockBuilder: InstructionBuilder): pb.Variable;
/**
 * Processes a return statement.
 */
export declare function ret(result: Expr, blockBuilder: BlockBuilder, loc?: Loc): void;
/**
 * Creates parameters on the callee-side of the caller-callee contract.
 */
export declare function setupCalleeParameters(params: pb.Variable[], ucfgBuilder: UcfgBuilder): void;
export declare function fetchObjectProperty(objVar: pb.Variable, property: Expr, builder: InstructionBuilder, fieldAccessLoc?: Loc): LValue;
export declare function storeObjectProperty(objVar: pb.Variable, property: Expr, value: Expr, builder: InstructionBuilder, fieldWriteLoc?: Loc): void;
export declare function getPrototype(obj: Expr, builder: InstructionBuilder, loc: Loc): pb.Variable;
export declare function setPrototype(obj: Expr, prototyp: Expr, builder: InstructionBuilder, loc?: Loc): void;
export declare function assignExprToField(object: pb.FieldAccess, field: string, expr: Expr, builder: InstructionBuilder, loc?: Loc): void;
export declare namespace EnvironmentAllocation {
    function defaultEnvironmentAllocation(): EnvironmentAllocationStrategy;
    function mergingEnvironmentAllocation(): EnvironmentAllocationStrategy;
    interface EnvironmentAllocationStrategy {
        allocateEnvironment(builder: InstructionBuilder): pb.Variable;
        attachEnvironmentToClosure(closure: pb.Variable, env: pb.Variable, builder: InstructionBuilder): void;
        fetchEnvironmentFromClosure(closure: pb.Variable, builder: InstructionBuilder): LValue;
        propagateIntoNestedEnvironment(outerEnv: pb.Variable, nestedEnv: pb.Variable, scopeName: string, builder: InstructionBuilder): void;
        /**
         * Stores the value of `this` from the current scope in an environment that is supposed to
         * be passed to the nested scopes.
         */
        storeCurrentLexicalThis(env: pb.Variable, lexicalThisState: LexicalThisState, builder: InstructionBuilder): void;
        /**
         * Propagates lexical `this` from current environment into child environment.
         *
         * @param nestedEnv child environment
         * @param lexicalThisState state of the structure holding information about lexical `this` for parent node
         * @param builder parent builder
         */
        storeOuterLexicalThis(nestedEnv: pb.Variable, lexicalThisState: LexicalThisState, builder: InstructionBuilder): void;
        /**
         * Fetches value of `this` bound lexically in an outer scope.
         *
         * Not applicable to `this` in the current scope.
         */
        fetchLexicalThis(lexicalThisState: LexicalThisState): Expr;
    }
}
/**
 * Maps binary operators to corresponding IDs of built-in functions.
 *
 * Updating assignment operators are excluded.
 *
 * Short-circuiting operators `&&` and `||` are excluded
 * (they generate blocks and jumps, not single instructions).
 */
export declare function getBuiltinNameForBinaryOperator(operator: string): string;
