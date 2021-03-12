"use strict";
/*
 * Copyright (C) 2020-2021 SonarSource SA
 * All rights reserved
 * mailto:info AT sonarsource DOT com
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldAccess = exports.className = exports._undefined = exports._this = exports.last = exports.literal = exports.intLiteral = exports.stringLiteral = exports.vbl = exports.loc = exports.FragmentBuilder = exports.BlockBuilder = exports.InstructionBuilder = exports.beginUcfg = exports.UcfgBuilder = exports.SHARED_DEFS = exports.FRAGMENTS = void 0;
/**
 * This module provides constructors that
 * simplify the construction of UCFGs.
 *
 * See `ucfg-builders.test.ts` for some examples, and in particularly
 * note that these constructors support two ways for dealing with variables,
 * one manual, and one where variable names are generated automatically
 * (see `binding synthetic temporary variables` example for that).
 */
const pb = __importStar(require("./ucfg_pb"));
const utils_1 = require("./utils");
const DEFAULT_VARIABLE_TYPE = '';
const UNKNOWN_LOCATION = loc('__unknown_file', 1, 1, 1, 1);
const BUILTIN_ID_FUNCTION = '__id';
exports.FRAGMENTS = [
    'preamble',
    'shared-readonly',
    'scope',
    'shared-imports',
    'hoisting',
];
exports.SHARED_DEFS = ['global', 'globalBuiltins'];
class UcfgBuilder {
    constructor(methodId, thisVar, parameters, ucfgLocation, parentBuilders) {
        this.methodId = methodId;
        this.thisVar = thisVar;
        this.parameters = parameters;
        this.parentBuilders = parentBuilders;
        this.entries = [];
        this.blockBuilders = new Map();
        this.fragmentBuilders = new Map();
        this.sharedDefs = new Set();
        /**
         * Maps the ucfg-ids of imported modules to local variables that hold the
         * result of importing the module.
         */
        this.sharedImports = new Map();
        this.syntheticVariableCounter = 0;
        this.ucfgLocation = this.normalizeLoc(ucfgLocation);
    }
    freshVarName() {
        const name = `%${this.syntheticVariableCounter}`;
        this.syntheticVariableCounter = this.syntheticVariableCounter + 1;
        return name;
    }
    freshVar(typ) {
        return vbl(this.freshVarName(), typ);
    }
    setMethodId(id) {
        this.methodId = id;
        return this;
    }
    getMethodId() {
        return this.methodId;
    }
    setThisVar(t) {
        this.thisVar = toExpressionExceptFieldAccess(t);
        return this;
    }
    setParameters(ps) {
        this.parameters = ps;
        return this;
    }
    getLocation() {
        return this.ucfgLocation;
    }
    setLocation(ucfgLocation) {
        this.ucfgLocation = this.normalizeLoc(ucfgLocation);
        return this;
    }
    setFragmentBuilder(key, builder) {
        this.fragmentBuilders.set(key, builder);
    }
    getFragmentBuilder(key) {
        return this.fragmentBuilders.get(key);
    }
    getBlockBuilders() {
        return Array.from(this.blockBuilders.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }
    checkHasSharedDef(key) {
        return this.sharedDefs.has(key);
    }
    /**
     * Marks a shared definition as already created.
     */
    setHasSharedDef(key) {
        this.sharedDefs.add(key);
        return this;
    }
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
    getOrElseUpdateSharedImport(source, importModule) {
        const maybeVbl = this.sharedImports.get(source);
        if (maybeVbl) {
            return maybeVbl;
        }
        else {
            const v = importModule(source);
            this.sharedImports.set(source, v);
            return v;
        }
    }
    /**
     * Creates a block builder associated with this UCFG.
     *
     * Once the block is build (terminated with jump or return), it will
     * be added to this UCFG automatically.
     */
    beginBlock(id, blockLocation, isEntry = false) {
        if (isEntry) {
            this.entries.push(id);
        }
        const normalizedLoc = blockLocation || UNKNOWN_LOCATION;
        const blockBuilder = new BlockBuilder(this, id, normalizedLoc);
        this.blockBuilders.set(id, blockBuilder);
        return blockBuilder;
    }
    /**
     * Same as `block`, but additionally marks this block as entry.
     *
     * Convenience method, mainly for manually generated UCFGs in tests.
     */
    beginEntryBlock(id, blockLocation) {
        return this.beginBlock(id, blockLocation, true);
    }
    build() {
        const builtBlocks = Array.from(this.blockBuilders.entries())
            .sort(([n1, _b1], [n2, _b2]) => n1.localeCompare(n2, 'en', { numeric: true, sensitivity: 'case' }))
            .map(([_name, b]) => b.build());
        const u = new pb.UCFG();
        u.setMethodId(this.methodId);
        u.setLocation(this.ucfgLocation);
        u.setParametersList([]);
        u.setEntriesList(this.entries);
        u.setBasicBlocksList(builtBlocks);
        u.setParametersWithTypesList(this.parameters);
        u.setThisVar(this.thisVar);
        return u;
    }
    normalizeLoc(location) {
        if (location instanceof pb.Location) {
            return location;
        }
        else if (location === null ||
            typeof location === 'undefined' ||
            (!location.source && !this.ucfgLocation)) {
            return UNKNOWN_LOCATION;
        }
        else {
            return loc(location.source || this.ucfgLocation.getFileId(), location.start.line, location.start.column, location.end.line, location.end.column);
        }
    }
}
exports.UcfgBuilder = UcfgBuilder;
/** The main entry point into `UCFG`-builder. */
function beginUcfg(methodId, thisVar, parameters, location, parentBuilders) {
    const definedParams = parameters || [];
    return new UcfgBuilder(methodId, toExpressionExceptFieldAccess(thisVar), definedParams, location, parentBuilders);
}
exports.beginUcfg = beginUcfg;
class InstructionBuilder {
    assignCall(lhs, methodId, args, kwargs, location) {
        const normalizedArgs = this.normalizeArgs(args, location, false);
        // Temporary workaround [no ticket]
        //
        // The simulation engine crashes on Java side if it gets
        // an empty argument list. Give it something so it doesn't
        // crash with an IllegalArgumentException.
        utils_1.ensureNonEmptyOrElseAdd(normalizedArgs, () => toExpressionExceptFieldAccess(_undefined()));
        const normalizedKwargs = this.normalizeKwargs(kwargs, location, false);
        const normalizedLoc = this.normalizeLoc(location);
        const asgn = new pb.AssignCall();
        if (lhs instanceof pb.FieldAccess) {
            asgn.setFieldAccess(lhs);
        }
        else {
            asgn.setVariable(normalizeVariable(lhs));
        }
        asgn.setLocation(normalizedLoc);
        asgn.setMethodid(methodId);
        asgn.setArgsList(normalizedArgs);
        asgn.setKeywordargumentsList(normalizedKwargs);
        const instr = new pb.Instruction();
        instr.setAssignCall(asgn);
        this.addInstruction(instr);
        return this;
    }
    assignNewObject(lhs, typ, location) {
        const normalizedLoc = this.normalizeLoc(location);
        const asgn = new pb.NewObject();
        if (lhs instanceof pb.FieldAccess) {
            asgn.setFieldAccess(lhs);
        }
        else {
            asgn.setVariable(normalizeVariable(lhs));
        }
        asgn.setType(typ);
        asgn.setLocation(normalizedLoc);
        const instr = new pb.Instruction();
        instr.setNewObject(asgn);
        this.addInstruction(instr);
        return this;
    }
    assignVirtualCall(lhs, methodName, methodId, args, kwargs, location) {
        const normalizedArgs = this.normalizeArgs(args, location, false);
        utils_1.ensureNonEmptyOrElseAdd(normalizedArgs, () => toExpressionExceptFieldAccess(_undefined()));
        const normalizedKwargs = this.normalizeKwargs(kwargs, location, false);
        const normalizedLoc = this.normalizeLoc(location);
        const asgn = new pb.AssignVirtualCall();
        if (lhs instanceof pb.FieldAccess) {
            asgn.setFieldAccess(lhs);
        }
        else {
            asgn.setVariable(normalizeVariable(lhs));
        }
        asgn.setLocation(normalizedLoc);
        asgn.setMethodid(methodId);
        asgn.setMethodName(methodName);
        asgn.setArgsList(normalizedArgs);
        asgn.setKeywordargumentsList(normalizedKwargs);
        const instr = new pb.Instruction();
        instr.setAssignVCall(asgn);
        this.addInstruction(instr);
        return this;
    }
    assignDynamicCall(lhs, methodReference, args, kwargs, location) {
        const normalizedArgs = this.normalizeArgs(args, location, true);
        utils_1.ensureNonEmptyOrElseAdd(normalizedArgs, () => toExpressionExceptFieldAccess(_undefined()));
        const normalizedKwargs = this.normalizeKwargs(kwargs, location, false);
        const normalizedLoc = this.normalizeLoc(location);
        const asgn = new pb.AssignDynamicCall();
        if (lhs instanceof pb.FieldAccess) {
            asgn.setFieldAccess(lhs);
        }
        else {
            asgn.setVariable(normalizeVariable(lhs));
        }
        asgn.setLocation(normalizedLoc);
        const normalizedMethodRef = this.ensureIsVariableOrFieldAccess(methodReference);
        if (normalizedMethodRef instanceof pb.Variable) {
            asgn.setMethodreferencevariable(normalizedMethodRef);
        }
        else {
            asgn.setMethodreferencefieldaccess(normalizedMethodRef);
        }
        asgn.setArgsList(normalizedArgs);
        asgn.setKeywordargumentsList(normalizedKwargs);
        const instr = new pb.Instruction();
        instr.setAssignDCall(asgn);
        this.addInstruction(instr);
        return this;
    }
    assignExpr(lhs, expr, location) {
        let normalizedArg;
        if (expr instanceof pb.FieldAccess) {
            normalizedArg = this.toExpression(expr, location, true);
        }
        else {
            normalizedArg = toExpressionExceptFieldAccess(expr);
        }
        const normalizedLoc = this.normalizeLoc(location);
        const asgn = new pb.AssignCall();
        if (lhs instanceof pb.FieldAccess) {
            asgn.setFieldAccess(lhs);
        }
        else {
            asgn.setVariable(normalizeVariable(lhs));
        }
        asgn.setLocation(normalizedLoc);
        asgn.setMethodid(BUILTIN_ID_FUNCTION);
        asgn.setArgsList([normalizedArg]);
        asgn.setKeywordargumentsList([]);
        const instr = new pb.Instruction();
        instr.setAssignCall(asgn);
        this.addInstruction(instr);
        return this;
    }
    /**
     * Stores expression in a variable, if necessary. Otherwise, returns the variable directly.
     *
     * This is a convenience method for getting a value stored in a variable, because there
     * are some operations which accept only variables, but not general expressions.
     *
     * @param expr A JS-value that is canonically convertible into a UCFG-expression.
     * @param location location of the `estree.Node` that evaluated to the expression.
     */
    ensureStoredInVariable(expr) {
        if (expr instanceof pb.Variable) {
            return expr;
        }
        else if (expr instanceof pb.Expression && expr.hasVar()) {
            return utils_1.assertIsDefinedNonNull(expr.getVar(), 'Protobuf: hasVar() is true, therefore getVar() must succeed.');
        }
        else {
            return this.expr(expr);
        }
    }
    ensureIsVariableOrFieldAccess(expr) {
        if (expr instanceof pb.FieldAccess) {
            return expr;
        }
        else {
            return this.ensureStoredInVariable(expr);
        }
    }
    call(methodId, args, kwargs, returnType, location) {
        const v = this.freshVar(returnType);
        this.assignCall(v, methodId, args, kwargs, location);
        return v;
    }
    newObject(typ, location) {
        const v = this.freshVar(typ);
        this.assignNewObject(v, typ, location);
        return v;
    }
    virtualCall(methodName, methodId, args, kwargs, returnType, location) {
        const v = this.freshVar(returnType);
        this.assignVirtualCall(v, methodName, methodId, args, kwargs, location);
        return v;
    }
    dynamicCall(methodReference, args, kwargs, returnType, location) {
        const v = this.freshVar(returnType);
        this.assignDynamicCall(v, methodReference, args, kwargs, location);
        return v;
    }
    expr(expr, exprType, location) {
        const v = this.freshVar(exprType);
        this.assignExpr(v, expr, location);
        return v;
    }
    /**
     * Converts all `Expr` into `pb.Expression`s.
     *
     * Warning: make sure that you activate `allowInlinedFieldAccess` only
     * if you know that it is supported on the sonar-security core engine
     * side: field accesses used as `expression`s in certain instructions
     * can cause an error on the engine's side.
     */
    toExpression(expr, location, allowInlinedFieldAccess = false) {
        if (expr instanceof pb.FieldAccess) {
            const e = new pb.Expression();
            if (allowInlinedFieldAccess) {
                e.setFieldAccess(expr);
            }
            else {
                // CALL's crash with a runtime error if
                // a fieldAccess ends up in an argument
                // position, so we wrap it into a separate
                // variable.
                e.setVar(this.expr(expr, undefined, location));
            }
            return e;
        }
        else {
            return toExpressionExceptFieldAccess(expr);
        }
    }
    normalizeArgs(args, location, allowInlinedFieldAccess) {
        return (args || []).map(x => this.toExpression(x, location, allowInlinedFieldAccess));
    }
    normalizeKwargs(kwargs, location, allowInlinedFieldAccess) {
        const definedKwargs = kwargs || {};
        const res = [];
        for (const keyword in definedKwargs) {
            const kw = new pb.KeywordArgument();
            kw.setKeyword(keyword);
            kw.setValue(this.toExpression(definedKwargs[keyword], location, allowInlinedFieldAccess));
            res.push(kw);
        }
        return res;
    }
}
exports.InstructionBuilder = InstructionBuilder;
class BlockBuilder extends InstructionBuilder {
    constructor(ucfgBuilder, id, blockLocation) {
        super();
        this.ucfgBuilder = ucfgBuilder;
        this.id = id;
        this.instructions = [];
        this.blockLocation = UNKNOWN_LOCATION;
        this.terminator = undefined;
        this.blockLocation = this.normalizeLoc(blockLocation);
    }
    addInstruction(i) {
        if (!this.terminator) {
            this.instructions.push(i);
        }
    }
    addFragment(dp) {
        if (!this.terminator) {
            this.instructions.push(dp);
        }
    }
    ret(result, location) {
        const normalizedLoc = this.normalizeLoc(location);
        const normalizedResult = this.toExpression(result || _undefined(), location, true);
        const r = new pb.Return();
        r.setLocation(normalizedLoc);
        r.setReturnedExpression(normalizedResult);
        this.terminator = r;
        return this.ucfgBuilder;
    }
    jump(destinations) {
        const j = new pb.Jump();
        j.setDestinationsList(destinations);
        this.terminator = j;
        return this.ucfgBuilder;
    }
    freshVar(typ) {
        return this.ucfgBuilder.freshVar(typ);
    }
    /**
     * Creates a new fragment, inserts it at the position of the current
     * would-be instruction, and returns the fragment builder to the caller, so that the
     * caller can later fill it with the actual instructions.
     */
    beginFragment() {
        const p = new FragmentBuilder(this.ucfgBuilder);
        this.addFragment(p);
        return p;
    }
    isDone() {
        return Boolean(this.terminator);
    }
    build() {
        const block = new pb.BasicBlock();
        block.setId(this.id);
        block.setLocation(this.blockLocation);
        block.setInstructionsList(flattenInstructionLikes(this.instructions));
        if (!this.terminator) {
            this.ret();
        }
        if (this.terminator instanceof pb.Return) {
            block.setRet(this.terminator);
        }
        else {
            block.setJump(this.terminator);
        }
        return block;
    }
    normalizeLoc(location) {
        return this.ucfgBuilder.normalizeLoc(location);
    }
}
exports.BlockBuilder = BlockBuilder;
/**
 * Converts expression-like entities (except field accesses) into `pb.Expression`s.
 */
function toExpressionExceptFieldAccess(expr) {
    const e = new pb.Expression();
    if (typeof expr === 'number') {
        e.setIntLiteral(intLiteral(expr));
    }
    else if (expr instanceof pb.Variable) {
        e.setVar(expr);
    }
    else if (expr instanceof pb.This) {
        e.setThis(expr);
    }
    else if (expr instanceof pb.ClassName) {
        e.setClassName(expr);
    }
    else if (expr instanceof pb.Constant) {
        e.setConst(expr);
    }
    else if (expr instanceof pb.Last) {
        e.setLast(expr);
    }
    else {
        e.setIntLiteral(expr);
    }
    return e;
}
/**
 * A fragment of a basic block that cannot be generated right away,
 * but needs additional information in order to decide what instructions
 * to emit.
 */
class FragmentBuilder extends InstructionBuilder {
    constructor(ucfgBuilder) {
        super();
        this.ucfgBuilder = ucfgBuilder;
        this.instructions = [];
    }
    freshVar(typ) {
        return this.ucfgBuilder.freshVar(typ);
    }
    normalizeLoc(location) {
        return this.ucfgBuilder.normalizeLoc(location);
    }
    addInstruction(instr) {
        this.instructions.push(instr);
    }
    getInstructions() {
        return this.instructions;
    }
}
exports.FragmentBuilder = FragmentBuilder;
function flattenInstructionLikes(ils) {
    const res = [];
    for (const il of ils) {
        if (il instanceof pb.Instruction) {
            res.push(il);
        }
        else {
            res.push(...il.getInstructions());
        }
    }
    return res;
}
function loc(fileId, startLine, startLineOffset, endLine, endLineOffset) {
    const res = new pb.Location();
    res.setStartLine(startLine | 0);
    res.setEndLine(endLine | 0);
    res.setStartLineOffset(startLineOffset | 0);
    res.setEndLineOffset(endLineOffset | 0);
    res.setFileId(fileId);
    return res;
}
exports.loc = loc;
function vbl(name, declaredType = DEFAULT_VARIABLE_TYPE) {
    const v = new pb.Variable();
    v.setName(name);
    v.setDeclaredType(declaredType);
    return v;
}
exports.vbl = vbl;
function stringLiteral(value) {
    const res = new pb.Constant();
    // This does not represent the string faithfully, but is safe to serialize.
    // The deserializer expects valid unicode encoded as UTF-8, which is not always possible
    // if there are e.g. unpaired surrogate pairs; Therefore, we simply eliminate all
    // surrogate pair code units.
    const safeValue = utils_1.eliminateProblematicCodeUnits(value);
    res.setValue(safeValue);
    return res;
}
exports.stringLiteral = stringLiteral;
function intLiteral(value) {
    const res = new pb.IntLiteral();
    res.setValue(value | 0);
    return res;
}
exports.intLiteral = intLiteral;
function literal(value) {
    if (typeof value === 'number') {
        return intLiteral(value);
    }
    else {
        return stringLiteral(value);
    }
}
exports.literal = literal;
function last() {
    return new pb.Last();
}
exports.last = last;
function _this(declaredType) {
    const dt = declaredType ? declaredType : '';
    const res = new pb.This();
    res.setDeclaredType(dt);
    return res;
}
exports._this = _this;
function _undefined() {
    return stringLiteral('');
}
exports._undefined = _undefined;
function className(value) {
    const cn = new pb.ClassName();
    cn.setName(value);
    return cn;
}
exports.className = className;
function fieldAccess(obj, field) {
    const fa = new pb.FieldAccess();
    if (typeof obj === 'string') {
        fa.setObject(vbl(obj));
    }
    else if (obj instanceof pb.Variable) {
        fa.setObject(obj);
    }
    else if (obj instanceof pb.This) {
        fa.setThis(obj);
    }
    else {
        fa.setClassName(obj);
    }
    fa.setField(normalizeVariable(field));
    return fa;
}
exports.fieldAccess = fieldAccess;
function normalizeVariable(v) {
    if (typeof v === 'string') {
        return vbl(v);
    }
    else {
        return v;
    }
}
//# sourceMappingURL=ucfg-builders.js.map