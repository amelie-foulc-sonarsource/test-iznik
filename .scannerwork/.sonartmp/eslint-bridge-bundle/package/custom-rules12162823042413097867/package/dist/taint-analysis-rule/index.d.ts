import { Rule } from 'eslint';
import { UcfgEmitter, HasLexicalStructure } from './inspection';
export declare type TaintAnalysisRule = Rule.RuleModule & UcfgEmitter & HasLexicalStructure;
/**
 * Creates a new `TaintAnalysisRule` with fresh UID-generators.
 */
export declare function ruleFactory(): TaintAnalysisRule;
