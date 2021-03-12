import { Rule } from 'eslint';
import * as estree from 'estree';
export declare function checkSensitiveCall(context: Rule.RuleContext, callExpression: estree.CallExpression, sensitiveArgumentIndex: number, sensitiveProperty: string, sensitivePropertyValue: boolean, message: string): void;
