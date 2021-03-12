/**
 * This module provides constructors that
 * simplify the construction of UCFGs.
 *
 * See `ucfg-builders.test.ts` for some examples, and in particularly
 * note that these constructors support two ways for dealing with variables,
 * one manual, and one where variable names are generated automatically
 * (see `binding synthetic temporary variables` example for that).
 */
import * as pb from './ucfg_pb';
import { SourceLocation } from 'estree';
import { Brand } from './utils';
import { UcfgId } from './ucfg-id';
export declare const FRAGMENTS: readonly ["preamble", "shared-readonly", "scope", "shared-imports", "hoisting"];
export declare type FragmentKind = typeof FRAGMENTS[number];
export declare const SHARED_DEFS: readonly ["global", "globalBuiltins"];
export declare type SharedDefKind = typeof SHARED_DEFS[number];
/**
 * The string referencing another module in an `import` or `require`,
 * as used in the `string`-property of various `Import*` and `Export*`-nodes.
 */
export declare type ImportSource = Brand<string, 'ImportSource'>;
export declare class UcfgBuilder {
    private methodId;
    private thisVar;
    private parameters;
    readonly parentBuilders: Builders | undefined;
    private readonly entries;
    private ucfgLocation;
    private readonly blockBuilders;
    private readonly fragmentBuilders;
    private readonly sharedDefs;
    /**
     * Maps the ucfg-ids of imported modules to local variables that hold the
     * result of importing the module.
     */
    private readonly sharedImports;
    constructor(methodId: UcfgId, thisVar: pb.Expression, parameters: pb.Variable[], ucfgLocation: Loc, parentBuilders: Builders | undefined);
    private syntheticVariableCounter;
    freshVarName(): string;
    freshVar(typ?: string): pb.Variable;
    setMethodId(id: UcfgId): UcfgBuilder;
    getMethodId(): string;
    setThisVar(t: ExprExceptFieldAccess): UcfgBuilder;
    setParameters(ps: pb.Variable[]): UcfgBuilder;
    getLocation(): Loc | undefined;
    setLocation(ucfgLocation: Loc): UcfgBuilder;
    setFragmentBuilder(key: FragmentKind, builder: FragmentBuilder): void;
    getFragmentBuilder(key: FragmentKind): FragmentBuilder | undefined;
    getBlockBuilders(): [string, BlockBuilder][];
    checkHasSharedDef(key: SharedDefKind): boolean;
    /**
     * Marks a shared definition as already created.
     */
    setHasSharedDef(key: SharedDefKind): UcfgBuilder;
    /**
     * Attempts to get a local variable that holds an imported module;
     * Imports the module, caches the variable, and returns the variable in case
     * a module has not been imported yet.
     *
     * @param key the string identifying a module,
     *            as used directly in the `require` call or `import` clause
     * @param createImport a strategy for importing the module and saving the
     *                     imported value in a local variable.
     */
    getOrElseUpdateSharedImport(source: ImportSource, importModule: (source: ImportSource) => pb.Variable): pb.Variable;
    /**
     * Creates a block builder associated with this UCFG.
     *
     * Once the block is build (terminated with jump or return), it will
     * be added to this UCFG automatically.
     */
    beginBlock(id: string, blockLocation?: Loc, isEntry?: boolean): BlockBuilder;
    /**
     * Same as `block`, but additionally marks this block as entry.
     *
     * Convenience method, mainly for manually generated UCFGs in tests.
     */
    beginEntryBlock(id: string, blockLocation?: Loc): BlockBuilder;
    build(): pb.UCFG;
    normalizeLoc(location: Loc): pb.Location;
}
/** The main entry point into `UCFG`-builder. */
export declare function beginUcfg(methodId: UcfgId, thisVar: ExprExceptFieldAccess, parameters?: pb.Variable[], location?: Loc, parentBuilders?: Builders): UcfgBuilder;
export declare type Loc = SourceLocation | pb.Location | undefined | null;
/** Keyworded arguments passed to calls (values are as concise as possible to write). */
interface Kwargs {
    [keyword: string]: Expr;
}
export declare type LValue = pb.Variable | pb.FieldAccess;
export declare abstract class InstructionBuilder {
    abstract freshVar(typ?: string): pb.Variable;
    protected abstract addInstruction(i: pb.Instruction): void;
    protected abstract normalizeLoc(loc: Loc): pb.Location;
    assignCall(lhs: LValue | string, methodId: string, args?: Expr[], kwargs?: Kwargs, location?: Loc): this;
    assignNewObject(lhs: LValue | string, typ: string, location?: Loc): this;
    assignVirtualCall(lhs: LValue | string, methodName: string, methodId: string, args?: Expr[], kwargs?: Kwargs, location?: Loc): this;
    assignDynamicCall(lhs: LValue | string, methodReference: Expr, args?: Expr[], kwargs?: Kwargs, location?: Loc): this;
    assignExpr(lhs: LValue | string, expr: Expr, location?: Loc): this;
    /**
     * Stores expression in a variable, if necessary. Otherwise, returns the variable directly.
     *
     * This is a convenience method for getting a value stored in a variable, because there
     * are some operations which accept only variables, but not general expressions.
     *
     * @param expr A JS-value that is canonically convertible into a UCFG-expression.
     * @param location location of the `estree.Node` that evaluated to the expression.
     */
    ensureStoredInVariable(expr: Expr): pb.Variable;
    ensureIsVariableOrFieldAccess(expr: Expr): LValue;
    call(methodId: string, args?: Expr[], kwargs?: Kwargs, returnType?: string, location?: Loc): pb.Variable;
    newObject(typ: string, location?: Loc): pb.Variable;
    virtualCall(methodName: string, methodId: string, args?: Expr[], kwargs?: Kwargs, returnType?: string, location?: Loc): pb.Variable;
    dynamicCall(methodReference: Expr, args?: Expr[], kwargs?: Kwargs, returnType?: string, location?: Loc): pb.Variable;
    expr(expr: Expr, exprType?: string, location?: Loc): pb.Variable;
    /**
     * Converts all `Expr` into `pb.Expression`s.
     *
     * Warning: make sure that you activate `allowInlinedFieldAccess` only
     * if you know that it is supported on the sonar-security core engine
     * side: field accesses used as `expression`s in certain instructions
     * can cause an error on the engine's side.
     */
    toExpression(expr: Expr, location?: Loc, allowInlinedFieldAccess?: boolean): pb.Expression;
    normalizeArgs(args: Expr[] | undefined, location: Loc | undefined, allowInlinedFieldAccess: boolean): pb.Expression[];
    normalizeKwargs(kwargs: Kwargs | undefined, location: Loc | undefined, allowInlinedFieldAccess: boolean): pb.KeywordArgument[];
}
export declare class BlockBuilder extends InstructionBuilder {
    private readonly ucfgBuilder;
    private readonly id;
    private readonly instructions;
    private readonly blockLocation;
    private terminator;
    constructor(ucfgBuilder: UcfgBuilder, id: string, blockLocation: Loc);
    protected addInstruction(i: pb.Instruction): void;
    protected addFragment(dp: FragmentBuilder): void;
    ret(result?: Expr, location?: Loc): UcfgBuilder;
    jump(destinations: string[]): UcfgBuilder;
    freshVar(typ?: string): pb.Variable;
    /**
     * Creates a new fragment, inserts it at the position of the current
     * would-be instruction, and returns the fragment builder to the caller, so that the
     * caller can later fill it with the actual instructions.
     */
    beginFragment(): FragmentBuilder;
    isDone(): boolean;
    build(): pb.BasicBlock;
    protected normalizeLoc(location: Loc): pb.Location;
}
/**
 * A fragment of a basic block that cannot be generated right away,
 * but needs additional information in order to decide what instructions
 * to emit.
 */
export declare class FragmentBuilder extends InstructionBuilder {
    private readonly ucfgBuilder;
    private readonly instructions;
    constructor(ucfgBuilder: UcfgBuilder);
    freshVar(typ?: string): pb.Variable;
    protected normalizeLoc(location: Loc): pb.Location;
    protected addInstruction(instr: pb.Instruction): void;
    getInstructions(): pb.Instruction[];
}
export interface Builders {
    ucfgBuilder: UcfgBuilder;
    blockBuilder: BlockBuilder;
}
export declare function loc(fileId: string, startLine: number, startLineOffset: number, endLine: number, endLineOffset: number): pb.Location;
declare type ExprExceptFieldAccess = pb.Variable | pb.This | pb.ClassName | pb.Constant | pb.IntLiteral | pb.Last | number;
export declare type Expr = ExprExceptFieldAccess | pb.FieldAccess;
export declare function vbl(name: string, declaredType?: string): pb.Variable;
export declare function stringLiteral(value: string): pb.Constant;
export declare function intLiteral(value: number): pb.IntLiteral;
export declare function literal(value: number | string): Expr;
export declare function last(): pb.Last;
export declare function _this(declaredType?: string): pb.This;
export declare function _undefined(): pb.Constant;
export declare function className(value: string): pb.ClassName;
export declare type FieldAccessTarget = pb.Variable | string | pb.This | pb.ClassName;
export declare function fieldAccess(obj: FieldAccessTarget, field: pb.Variable | string): pb.FieldAccess;
export {};
