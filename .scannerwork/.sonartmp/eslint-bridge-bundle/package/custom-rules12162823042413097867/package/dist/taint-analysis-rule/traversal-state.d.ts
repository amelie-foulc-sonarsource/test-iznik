import { Rule } from 'eslint';
import * as estree from 'estree';
import * as pb from '../ucfg_pb';
import * as ah from '../ast-handlers';
import { LexicalStructure } from '../lexical-structure';
import { UcfgIdSavingScopeNameGen } from './scope-name-gen';
/**
 * Stack frame that knows how to resume the processing of an
 * AST element once all children were processed.
 *
 * Also holds the map with the values returned by the children.
 * This map is modified each time a child finishes processing,
 * and is then passed to the `onExit`-handler.
 */
export declare class AstElementFrame {
    readonly node: estree.Node;
    readonly onExit: ah.AstElementExitHandler;
    readonly childReturns: ah.AstElementTraversalResults;
    constructor(node: estree.Node, onExit: ah.AstElementExitHandler, childReturns?: ah.AstElementTraversalResults);
    addResultReturnedByChild(child: estree.Node, result: ah.AstElementTraversalResult): void;
    resume(): ah.AstElementTraversalResult;
}
/**
 * Manages multiple data structures (mostly stacks) that are shared between
 * all handlers of the rule-listener; Also provides some common contextual objects
 * that are instantiated once for each analyzed file.
 */
export declare class TaintAnalysisRuleTraversalState {
    private readonly ruleContext;
    private readonly emittedUcfgs;
    private readonly scopeNameGen;
    /** Stack of "activation records" that belong to the traversed nodes. */
    private readonly astElementStack;
    /** Stack with current ucfg-builder and block-builder. */
    private readonly builderStack;
    /** Stack of names of environment-properties in which the innermost value of `this` is stored. */
    private readonly lexicalThisStack;
    /** Flag that is set whenever we are expect to encounter an entry-block next. */
    private isAtEntry;
    /** Current working directory (cached between all the callback-invocations). */
    private readonly cwd;
    private readonly options;
    private readonly handlerContext;
    constructor(ruleContext: Rule.RuleContext, emittedUcfgs: Map<string, pb.UCFG>, lexicalStructure: LexicalStructure, scopeNameGen: UcfgIdSavingScopeNameGen);
    private activeUcfgBuilder;
    private activeBlockBuilder;
    private readonly onCodePathStart;
    private readonly onCodePathSegmentStart;
    private readonly onCodePathSegmentEnd;
    private readonly onCodePathEnd;
    private readonly onNodeStart;
    private readonly onNodeEnd;
    private configureAstElementHandlerContext;
    /**
     * Creates an ESLint `RuleListener`, which contains several callbacks, which are
     * all interconnected through the state of this object.
     */
    createRuleListener(): Rule.RuleListener;
}
