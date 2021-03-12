import * as estree from 'estree';
import { Brand } from './utils';
/**
 * The `id` of an UCFG, as used by the symbolic analysis engine.
 */
export declare type UcfgId = Brand<string, 'UcfgId'>;
/**
 * Generates a default ID's for UCFGs based on current code path and node.
 *
 * These IDs should only be used for things that cannot be named with a
 * global TypeScript name. All other nodes (which can be named by in a TypeScript
 * declaration) should set more appropriate names.
 */
export declare function defaultUcfgId(sourceFile: string, cwd: string, node: estree.Node, shortId: string): UcfgId;
export declare function ucfgIdForModule(sourceFile: string): UcfgId;
