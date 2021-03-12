import * as estree from 'estree';
export declare type Brand<A, B extends string> = A & {
    __brand: B;
};
export declare function assertIsDefinedNonNull<T>(t: T | null | undefined, assumption: string): T;
export declare function peek<A>(arr: A[]): A;
/**
 * Ensures that the array is not empty.
 *
 * Inserts the value provided by the supplier if it needs to be.
 * Returns the same (but modified) array.
 */
export declare function ensureNonEmptyOrElseAdd<T>(arr: T[], valueToAddSupplier: () => T): T[];
/**
 * Eager equivalent of `||`, which unconditionally computes the fallback value.
 * @param a
 * @param fallback
 */
export declare function ensureDefinedOrElse<T>(a: T | undefined, fallback: T): T;
/**
 * Shortens the node type.
 */
export declare function shortenNodeType(nodeType: string): string;
/** A human readable name suitable to be used in UCFG ids. */
export declare function extractHumanReadableName(node: estree.Node): string;
export declare function shortenName(n: string): string;
export declare function shortenedParams(ps: estree.Pattern[]): string;
declare type NodesWithNeatSubLocation = estree.ArrowFunctionExpression | estree.FunctionDeclaration | estree.FunctionExpression;
export declare function extractNeatUcfgLocation(node: NodesWithNeatSubLocation): estree.SourceLocation | null | undefined;
/**
 * Ensures that the string is at most `n` characters long,
 * drops the prefix, if necessary.
 *
 * If no value is passed for `n`, the default length of 200 is ensured.
 */
export declare function enforceMaxLength(name: string, n?: number): string;
/**
 * Replaces everything that is not a plain ASCII alphanumeric character
 * with underscores.
 */
export declare function sanitizeWithUnderscores(s: string): string;
/**
 * Eliminates all UTF-16 surrogate code units.
 */
export declare function eliminateProblematicCodeUnits(s: string): string;
export {};
