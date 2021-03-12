import { Rule } from 'eslint';
export interface Options {
    emit: boolean;
    emitPath: string | undefined;
    envMerging: boolean;
    preamble: boolean;
}
export declare type OptionsSchema = {
    [K in keyof Options]: {
        type: string;
    };
};
export declare const OPTIONS_SCHEMA: OptionsSchema;
export declare function extractOptions(context: Rule.RuleContext): Options;
