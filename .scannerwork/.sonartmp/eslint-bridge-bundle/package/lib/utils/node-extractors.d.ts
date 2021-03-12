import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule, Scope } from 'eslint';
export declare function getUniqueWriteUsage(context: Rule.RuleContext, name: string): estree.Program | estree.WhileStatement | estree.DoWhileStatement | estree.ForStatement | estree.ForOfStatement | estree.ForInStatement | estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression | estree.Identifier | estree.SimpleLiteral | estree.RegExpLiteral | estree.SwitchCase | estree.CatchClause | estree.VariableDeclarator | estree.ExpressionStatement | estree.BlockStatement | estree.EmptyStatement | estree.DebuggerStatement | estree.WithStatement | estree.ReturnStatement | estree.LabeledStatement | estree.BreakStatement | estree.ContinueStatement | estree.IfStatement | estree.SwitchStatement | estree.ThrowStatement | estree.TryStatement | estree.VariableDeclaration | estree.ClassDeclaration | estree.ThisExpression | estree.ArrayExpression | estree.ObjectExpression | estree.YieldExpression | estree.UnaryExpression | estree.UpdateExpression | estree.BinaryExpression | estree.AssignmentExpression | estree.LogicalExpression | estree.MemberExpression | estree.ConditionalExpression | estree.SimpleCallExpression | estree.NewExpression | estree.SequenceExpression | estree.TemplateLiteral | estree.TaggedTemplateExpression | estree.ClassExpression | estree.MetaProperty | estree.AwaitExpression | estree.ImportExpression | estree.ChainExpression | estree.Property | estree.Super | estree.TemplateElement | estree.SpreadElement | estree.ObjectPattern | estree.ArrayPattern | estree.RestElement | estree.AssignmentPattern | estree.ClassBody | estree.MethodDefinition | estree.ImportDeclaration | estree.ExportNamedDeclaration | estree.ExportDefaultDeclaration | estree.ExportAllDeclaration | estree.ImportSpecifier | estree.ImportDefaultSpecifier | estree.ImportNamespaceSpecifier | estree.ExportSpecifier | undefined;
export declare function getUniqueWriteUsageOrNode(context: Rule.RuleContext, node: estree.Node): estree.Node;
export declare function getValueOfExpression<T extends estree.Node['type']>(context: Rule.RuleContext, expr: estree.Node | undefined | null, type: T): Extract<estree.Program, {
    type: T;
}> | Extract<estree.WhileStatement, {
    type: T;
}> | Extract<estree.DoWhileStatement, {
    type: T;
}> | Extract<estree.ForStatement, {
    type: T;
}> | Extract<estree.ForOfStatement, {
    type: T;
}> | Extract<estree.ForInStatement, {
    type: T;
}> | Extract<estree.FunctionDeclaration, {
    type: T;
}> | Extract<estree.FunctionExpression, {
    type: T;
}> | Extract<estree.ArrowFunctionExpression, {
    type: T;
}> | Extract<estree.Identifier, {
    type: T;
}> | Extract<estree.SimpleLiteral, {
    type: T;
}> | Extract<estree.RegExpLiteral, {
    type: T;
}> | Extract<estree.SwitchCase, {
    type: T;
}> | Extract<estree.CatchClause, {
    type: T;
}> | Extract<estree.VariableDeclarator, {
    type: T;
}> | Extract<estree.ExpressionStatement, {
    type: T;
}> | Extract<estree.BlockStatement, {
    type: T;
}> | Extract<estree.EmptyStatement, {
    type: T;
}> | Extract<estree.DebuggerStatement, {
    type: T;
}> | Extract<estree.WithStatement, {
    type: T;
}> | Extract<estree.ReturnStatement, {
    type: T;
}> | Extract<estree.LabeledStatement, {
    type: T;
}> | Extract<estree.BreakStatement, {
    type: T;
}> | Extract<estree.ContinueStatement, {
    type: T;
}> | Extract<estree.IfStatement, {
    type: T;
}> | Extract<estree.SwitchStatement, {
    type: T;
}> | Extract<estree.ThrowStatement, {
    type: T;
}> | Extract<estree.TryStatement, {
    type: T;
}> | Extract<estree.VariableDeclaration, {
    type: T;
}> | Extract<estree.ClassDeclaration, {
    type: T;
}> | Extract<estree.ThisExpression, {
    type: T;
}> | Extract<estree.ArrayExpression, {
    type: T;
}> | Extract<estree.ObjectExpression, {
    type: T;
}> | Extract<estree.YieldExpression, {
    type: T;
}> | Extract<estree.UnaryExpression, {
    type: T;
}> | Extract<estree.UpdateExpression, {
    type: T;
}> | Extract<estree.BinaryExpression, {
    type: T;
}> | Extract<estree.AssignmentExpression, {
    type: T;
}> | Extract<estree.LogicalExpression, {
    type: T;
}> | Extract<estree.MemberExpression, {
    type: T;
}> | Extract<estree.ConditionalExpression, {
    type: T;
}> | Extract<estree.SimpleCallExpression, {
    type: T;
}> | Extract<estree.NewExpression, {
    type: T;
}> | Extract<estree.SequenceExpression, {
    type: T;
}> | Extract<estree.TemplateLiteral, {
    type: T;
}> | Extract<estree.TaggedTemplateExpression, {
    type: T;
}> | Extract<estree.ClassExpression, {
    type: T;
}> | Extract<estree.MetaProperty, {
    type: T;
}> | Extract<estree.AwaitExpression, {
    type: T;
}> | Extract<estree.ImportExpression, {
    type: T;
}> | Extract<estree.ChainExpression, {
    type: T;
}> | Extract<estree.Property, {
    type: T;
}> | Extract<estree.Super, {
    type: T;
}> | Extract<estree.TemplateElement, {
    type: T;
}> | Extract<estree.SpreadElement, {
    type: T;
}> | Extract<estree.ObjectPattern, {
    type: T;
}> | Extract<estree.ArrayPattern, {
    type: T;
}> | Extract<estree.RestElement, {
    type: T;
}> | Extract<estree.AssignmentPattern, {
    type: T;
}> | Extract<estree.ClassBody, {
    type: T;
}> | Extract<estree.MethodDefinition, {
    type: T;
}> | Extract<estree.ImportDeclaration, {
    type: T;
}> | Extract<estree.ExportNamedDeclaration, {
    type: T;
}> | Extract<estree.ExportDefaultDeclaration, {
    type: T;
}> | Extract<estree.ExportAllDeclaration, {
    type: T;
}> | Extract<estree.ImportSpecifier, {
    type: T;
}> | Extract<estree.ImportDefaultSpecifier, {
    type: T;
}> | Extract<estree.ImportNamespaceSpecifier, {
    type: T;
}> | Extract<estree.ExportSpecifier, {
    type: T;
}> | undefined;
/**
 * for `x = 42` or `let x = 42` when visiting '42' returns 'x' variable
 */
export declare function getLhsVariable(context: Rule.RuleContext): Scope.Variable | undefined;
export declare function getVariableFromName(context: Rule.RuleContext, name: string): Scope.Variable | undefined;
/**
 * Takes array of arguments. Keeps following variable definitions
 * and unpacking arrays as long as possible. Returns flattened
 * array with all collected nodes.
 *
 * A usage example should clarify why this might be useful.
 * According to ExpressJs `app.use` spec, the arguments can be:
 *
 * - A middleware function.
 * - A series of middleware functions (separated by commas).
 * - An array of middleware functions.
 * - A combination of all of the above.
 *
 * This means that methods like `app.use` accept variable arguments,
 * but also arrays, or combinations thereof. This methods helps
 * to flatten out such complicated composed argument lists.
 */
export declare function flattenArgs(context: Rule.RuleContext, args: estree.Node[]): estree.Node[];
export declare function resolveIdentifiers(node: TSESTree.Node, acceptShorthand?: boolean): TSESTree.Identifier[];
export declare function getObjectExpressionProperty(node: estree.Node | undefined | null, propertyKey: string): estree.Property | undefined;
export declare function getPropertyWithValue(context: Rule.RuleContext, objectExpression: estree.ObjectExpression, propertyName: string, propertyValue: estree.Literal['value']): estree.Property | undefined;
export declare function resolveFromFunctionReference(context: Rule.RuleContext, functionIdentifier: estree.Identifier): estree.FunctionDeclaration | estree.FunctionExpression | null;
