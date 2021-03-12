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
exports.TaintAnalysisRuleTraversalState = exports.AstElementFrame = void 0;
const ucfg_builders_1 = require("../ucfg-builders");
const ucfg_id_1 = require("../ucfg-id");
const fs = __importStar(require("fs"));
const utils_1 = require("../utils");
const ah = __importStar(require("../ast-handlers"));
const ast_to_ucfg_1 = require("../ast-to-ucfg");
const lexical_structure_1 = require("../lexical-structure");
const backend_1 = require("../backend");
const options_1 = require("./options");
const save_ucfg_files_1 = require("./save-ucfg-files");
const resolve_module_1 = require("./resolve-module");
/**
 * Stack frame that knows how to resume the processing of an
 * AST element once all children were processed.
 *
 * Also holds the map with the values returned by the children.
 * This map is modified each time a child finishes processing,
 * and is then passed to the `onExit`-handler.
 */
class AstElementFrame {
    constructor(node, onExit, childReturns = new Map()) {
        this.node = node;
        this.onExit = onExit;
        this.childReturns = childReturns;
    }
    addResultReturnedByChild(child, result) {
        this.childReturns.set(child, result);
    }
    resume() {
        return this.onExit(this.childReturns);
    }
}
exports.AstElementFrame = AstElementFrame;
/**
 * Stack-element with builders required to process the current code path.
 */
class BuildersStackElement {
    constructor(ucfgBuilder, blockBuilder, bindsThis, segments = new Map()) {
        this.ucfgBuilder = ucfgBuilder;
        this.blockBuilder = blockBuilder;
        this.bindsThis = bindsThis;
        this.segments = segments;
    }
}
/**
 * Manages multiple data structures (mostly stacks) that are shared between
 * all handlers of the rule-listener; Also provides some common contextual objects
 * that are instantiated once for each analyzed file.
 */
class TaintAnalysisRuleTraversalState {
    constructor(ruleContext, emittedUcfgs, lexicalStructure, scopeNameGen) {
        this.ruleContext = ruleContext;
        this.emittedUcfgs = emittedUcfgs;
        this.scopeNameGen = scopeNameGen;
        /** Stack of "activation records" that belong to the traversed nodes. */
        this.astElementStack = [];
        /** Stack with current ucfg-builder and block-builder. */
        this.builderStack = [];
        /** Stack of names of environment-properties in which the innermost value of `this` is stored. */
        this.lexicalThisStack = [];
        /** Flag that is set whenever we are expect to encounter an entry-block next. */
        this.isAtEntry = false;
        this.onCodePathStart = (codePath, node) => {
            const loc = node.loc;
            loc.source = this.ruleContext.getFilename();
            const shortId = this.scopeNameGen.getUcfgId(node);
            let ucfgId;
            if (node.type === 'Program') {
                ucfgId = ucfg_id_1.ucfgIdForModule(this.ruleContext.getFilename());
            }
            else {
                ucfgId = ucfg_id_1.defaultUcfgId(this.ruleContext.getFilename(), this.cwd, node, shortId);
            }
            const currentUcfgBuilder = ucfg_builders_1.beginUcfg(ucfgId, ucfg_builders_1._this(), [], loc, this.builderStack.length > 0 ? utils_1.peek(this.builderStack) : undefined);
            // Synthetic block that is kept as a back-up for
            // AST nodes that might accidentally end up outside of any code path segment.
            const dummyUcfg = ucfg_builders_1.beginUcfg('dummy-catchall-ucfg', ucfg_builders_1._this());
            const initialDummyBlock = dummyUcfg.beginBlock('dummy-catchall-block', loc);
            const bindsThis = pushLexicalThis(node, shortId, this.lexicalThisStack, this.builderStack.length, this.handlerContext);
            this.builderStack.push(new BuildersStackElement(currentUcfgBuilder, initialDummyBlock, bindsThis));
            this.isAtEntry = true;
        };
        this.onCodePathSegmentStart = (segment, node) => {
            const ucfgBuilder = this.activeUcfgBuilder();
            const blockBuilder = ucfgBuilder.beginBlock(segment.id, node.loc, this.isAtEntry);
            const topBuilders = utils_1.peek(this.builderStack);
            topBuilders.blockBuilder = blockBuilder;
            topBuilders.segments.set(segment.id, segment);
            if (this.isAtEntry) {
                initializeFragmentBuilders(ucfgBuilder, blockBuilder);
            }
            this.isAtEntry = false;
        };
        this.onCodePathSegmentEnd = (segment, node) => {
            // Temporary workaround [no ticket] Debug `try-finally` control flow.
            //
            // The builder for segment is deliberately not cleared.
            // For whatever reason,
            // `try { a() } finally { b() } z();`
            // does not produce any block at all for `z` to live in.
            // So, it's better it ends up in a wrong block rather than crashing everything.
            this.isAtEntry = false;
        };
        this.onCodePathEnd = (codePath, node) => {
            const { ucfgBuilder, segments, bindsThis } = utils_1.assertIsDefinedNonNull(this.builderStack.pop(), 'For each `pop()` there must have been a corresponding `push()`');
            addTerminatorsToBlocks(ucfgBuilder, segments, this.options.preamble);
            const newUcfg = ucfgBuilder.build();
            this.emittedUcfgs.set(ucfgBuilder.getMethodId(), newUcfg);
            this.isAtEntry = false;
            popLexicalThis(this.lexicalThisStack, bindsThis);
            const scannerworkDir = new save_ucfg_files_1.ScannerworkDir(this.options);
            if (this.builderStack.length === 0 && this.options.emit) {
                for (const generatedUcfgBuilder of this.handlerContext.generatedUcfgBuilders) {
                    const newGeneratedUcfg = generatedUcfgBuilder.build();
                    this.emittedUcfgs.set(generatedUcfgBuilder.getMethodId(), newGeneratedUcfg);
                }
                for (const [k, v] of this.emittedUcfgs.entries()) {
                    const filePath = scannerworkDir.ucfgFilePath(k);
                    fs.writeFileSync(filePath, v.serializeBinary());
                }
            }
        };
        this.onNodeStart = (node) => {
            const handler = ast_to_ucfg_1.handlers[node.type] || ah.defaultHandler;
            const onExit = handler(node, this.activeUcfgBuilder(), this.activeBlockBuilder(), this.handlerContext);
            const frame = new AstElementFrame(node, onExit);
            this.astElementStack.push(frame);
        };
        this.onNodeEnd = (node) => {
            // Finish processing an AST element:
            // - pop the stack frame,
            // - Invoke its `onExit` handler with the collected return values,
            // - add the return value to the parent frame (if present).
            const frame = utils_1.assertIsDefinedNonNull(this.astElementStack.pop(), 'For each "pop"-operation, there must have been a corresponding "push"');
            const result = frame.resume();
            if (this.astElementStack.length > 0) {
                utils_1.peek(this.astElementStack).addResultReturnedByChild(node, result);
            }
        };
        this.cwd = process.cwd();
        const options = options_1.extractOptions(ruleContext);
        this.options = options;
        this.handlerContext = this.configureAstElementHandlerContext(options, lexicalStructure, ruleContext);
    }
    activeUcfgBuilder() {
        return utils_1.peek(this.builderStack).ucfgBuilder;
    }
    activeBlockBuilder() {
        return utils_1.peek(this.builderStack).blockBuilder;
    }
    configureAstElementHandlerContext(options, lexicalStructure, ruleContext) {
        return {
            envAllocationStrategy: options.envMerging
                ? backend_1.EnvironmentAllocation.mergingEnvironmentAllocation()
                : backend_1.EnvironmentAllocation.defaultEnvironmentAllocation(),
            lexicalStructure,
            ruleContext,
            includePreamble: options.preamble,
            lexicalThisState: new lexical_structure_1.LexicalThisState(0, `${backend_1.THIS}_topLevel`),
            resolveModule: (module) => resolve_module_1.resolveModule(module, ruleContext),
            generatedUcfgBuilders: [],
            idGen: lexical_structure_1.IdGen.counterBasedIdGen(0),
        };
    }
    /**
     * Creates an ESLint `RuleListener`, which contains several callbacks, which are
     * all interconnected through the state of this object.
     */
    createRuleListener() {
        return {
            onCodePathStart: this.onCodePathStart,
            onCodePathEnd: this.onCodePathEnd,
            onCodePathSegmentStart: this.onCodePathSegmentStart,
            onCodePathSegmentEnd: this.onCodePathSegmentEnd,
            '*': this.onNodeStart,
            '*:exit': this.onNodeEnd,
        };
    }
}
exports.TaintAnalysisRuleTraversalState = TaintAnalysisRuleTraversalState;
/**
 * Pushes the property name of last lexical `this` on the `lexicalThisStack`, if necessary.
 *
 * Returns a boolean which is `true` if a name has been pushed, `false` otherwise.
 */
function pushLexicalThis(node, shortId, lexicalThisStack, ucfgNestingDepth, ctx) {
    const maybeScope = ctx.lexicalStructure.getScopeForNode(node);
    let bindsThis = false;
    if (maybeScope && lexical_structure_1.isEffectiveScope(maybeScope)) {
        bindsThis = lexical_structure_1.hasThisBinding(maybeScope);
        if (bindsThis) {
            const thisPropertyName = `${backend_1.THIS}_${ucfgNestingDepth}_${shortId}`;
            lexicalThisStack.push(thisPropertyName);
        }
        const lastThisBindingName = utils_1.peek(lexicalThisStack);
        ctx.lexicalThisState = new lexical_structure_1.LexicalThisState(ucfgNestingDepth, lastThisBindingName);
    }
    return bindsThis;
}
/**
 * Pops property name of the last lexical `this`, if necessary.
 */
function popLexicalThis(lexicalThisStack, bindsThis) {
    if (bindsThis) {
        lexicalThisStack.pop();
    }
}
function initializeFragmentBuilders(ucfgBuilder, blockBuilder) {
    for (const k of ucfg_builders_1.FRAGMENTS) {
        ucfgBuilder.setFragmentBuilder(k, blockBuilder.beginFragment());
    }
}
function addTerminatorsToBlocks(ucfgBuilder, segments, preamble) {
    for (const [blockId, blockBuilder] of ucfgBuilder.getBlockBuilders()) {
        if (!blockBuilder.isDone()) {
            const seg = segments.get(blockId);
            const jumpTargets = utils_1.ensureDefinedOrElse(seg === null || seg === void 0 ? void 0 : seg.nextSegments, []).map(s => s.id);
            if (jumpTargets.length > 0) {
                blockBuilder.jump(jumpTargets);
            }
            else if (!ucfgBuilder.parentBuilders && preamble) {
                // If the UCFG builder denotes a `Program` and preamble generation is enabled, then the
                // set up of global environment finishes with the result of module initialization.
                blockBuilder.ret(ucfg_builders_1.fieldAccess('module', 'exports'));
            }
            else {
                blockBuilder.ret();
            }
        }
    }
}
//# sourceMappingURL=traversal-state.js.map