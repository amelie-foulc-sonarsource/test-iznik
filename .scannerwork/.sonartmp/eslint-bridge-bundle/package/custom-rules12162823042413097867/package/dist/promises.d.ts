import * as estree from 'estree';
import { AstElementHandlerContext } from './ast-handlers';
import { UcfgBuilder, BlockBuilder } from './ucfg-builders';
import * as pb from './ucfg_pb';
/**
 * Returns a Promise object with a `then` function and an internal result.
 *
 */
export declare function promise(node: estree.Node, result: pb.Variable, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, context: AstElementHandlerContext): pb.Variable;
