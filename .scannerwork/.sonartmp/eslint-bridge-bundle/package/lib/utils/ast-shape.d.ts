import { Scope } from 'eslint';
import * as estree from 'estree';
export declare type LoopLike = estree.WhileStatement | estree.DoWhileStatement | estree.ForStatement | estree.ForOfStatement | estree.ForInStatement;
export declare type FunctionNodeType = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;
export declare const FUNCTION_NODES: string[];
export declare const functionLike: Set<string>;
export declare function isIdentifier(node: estree.Node, ...values: string[]): node is estree.Identifier;
export declare function isMemberWithProperty(node: estree.Node, ...values: string[]): boolean;
export declare function isMemberExpression(node: estree.Node, objectValue: string, ...propertyValue: string[]): boolean;
export declare function isUnaryExpression(node: estree.Node | undefined): node is estree.UnaryExpression;
export declare function isArrayExpression(node: estree.Node | undefined): node is estree.ArrayExpression;
export declare function isRequireModule(node: estree.CallExpression, ...moduleNames: string[]): boolean;
export declare function isMethodInvocation(callExpression: estree.CallExpression, objectIdentifierName: string, methodName: string, minArgs: number): boolean;
export declare function isNamespaceSpecifier(importDeclaration: estree.ImportDeclaration, name: string): boolean;
export declare function isDefaultSpecifier(importDeclaration: estree.ImportDeclaration, name: string): boolean;
export declare function isModuleExports(node: estree.Node): boolean;
export declare function isFunctionNode(node: estree.Node): node is FunctionNodeType;
export declare function isLiteral(n: estree.Node | null): n is estree.Literal;
/**
 * Detect expression statements like the following:
 *  myArray[1] = 42;
 *  myArray[1] += 42;
 *  myObj.prop1 = 3;
 *  myObj.prop1 += 3;
 */
export declare function isElementWrite(statement: estree.ExpressionStatement, ref: Scope.Reference): boolean;
export declare function isReferenceTo(ref: Scope.Reference, node: estree.Node): boolean;
