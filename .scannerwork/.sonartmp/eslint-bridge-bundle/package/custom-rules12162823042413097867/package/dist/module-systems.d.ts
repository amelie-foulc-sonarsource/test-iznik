import * as estree from 'estree';
import { AstElementTraversalResult, AstElementTraversalResults, AstElementHandlerContext } from './ast-handlers';
import { BlockBuilder, ImportSource, UcfgBuilder } from './ucfg-builders';
import * as pb from './ucfg_pb';
/**
 * Helper method that handles both cases of importing user-defined and stubbed modules.
 *
 * It's supposed to be used with `UcfgBuilder`s `getOrElseUpdateSharedImport`, together
 * these methods ensure that import a module at most once per file, so that it's not
 * duplicated if there are multiple imports / re-exports referring to the same module.
 */
export declare function importModule(ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, ctx: AstElementHandlerContext): (source: ImportSource) => pb.Variable;
/** Handlers for ES6 `import`/`export` clauses. */
export declare function handleExportNamedDeclaration(node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, context: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleExportDefaultDeclaration(node: estree.Node, _ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, _context: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleExportSpecifier(node: estree.Node, _ucfgBuilder: UcfgBuilder, _blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, _context: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleExportAllDeclaration(node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, _childResults: AstElementTraversalResults, context: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleImportSpecifier(node: estree.Node, _ucfgBuilder: UcfgBuilder, _blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, _ctx: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleImportNamespaceSpecifier(node: estree.Node, _ucfgBuilder: UcfgBuilder, _blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, _ctx: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleImportDefaultSpecifier(node: estree.Node, _ucfgBuilder: UcfgBuilder, _blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, _ctx: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleImportDeclaration(node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, ctx: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleDynamicImport(node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, _childResults: AstElementTraversalResults, ctx: AstElementHandlerContext): AstElementTraversalResult;
export declare function extractDynamicImportSource(dynamicImport: estree.Node): estree.Node | undefined;
export declare function handleImportEquals(node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, ctx: AstElementHandlerContext): AstElementTraversalResult;
export declare function handleExportAssignment(node: estree.Node, ucfgBuilder: UcfgBuilder, blockBuilder: BlockBuilder, childResults: AstElementTraversalResults, _ctx: AstElementHandlerContext): AstElementTraversalResult;
