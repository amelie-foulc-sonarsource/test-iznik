interface Context {
    workDir: string;
    shouldUseTypeScriptParserForJS: boolean;
}
export declare function getContext(): Context;
export declare function setContext(ctx: Context): void;
export {};
