import * as estree from 'estree';
import { IdGen, ScopeNameGen } from '../lexical-structure';
/**
 * Name generator that additionally saves scopes belonging to UcfgIds.
 *
 * Basically same as scope name generator, but additionally creates a
 * map with node -> ucfg-id mapping along the way.
 */
export interface UcfgIdSavingScopeNameGen extends ScopeNameGen {
    getUcfgId(ucfgGeneratingNode: estree.Node): string;
}
/**
 * Constructs a `UcfgIdSavingScopeNameGen` from name generator for UCFGs and a name generator
 * for scopes.
 */
export declare function createUcfgIdSavingScopeNameGen(ucfgIdGen: IdGen, scopeIdGen: IdGen): UcfgIdSavingScopeNameGen;
