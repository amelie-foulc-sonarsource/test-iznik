import { LexicalStructure } from '../lexical-structure';
import * as pb from '../ucfg_pb';
/**
 * Gives access to emitted UCFGs (mostly for tests).
 */
export interface UcfgEmitter {
    getEmittedUcfgs(): Map<string, pb.UCFG>;
}
/**
 * Gives access to the computed lexical environment structure (for tests).
 */
export interface HasLexicalStructure {
    getLexicalStructure(): LexicalStructure | undefined;
    getDiagnosticPrettyPrint(): string;
}
