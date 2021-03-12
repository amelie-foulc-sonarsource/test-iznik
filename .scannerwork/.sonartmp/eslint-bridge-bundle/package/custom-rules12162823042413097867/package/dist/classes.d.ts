import * as estree from 'estree';
import { AstElementHandlerContext, AstElementTraversalResult, AstElementTraversalResults } from './ast-handlers';
import { BlockBuilder, UcfgBuilder } from './ucfg-builders';
export declare function handleClassDeclaration(node: estree.Node, _ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, _childResults: AstElementTraversalResults, _ctx: AstElementHandlerContext): AstElementTraversalResult;
