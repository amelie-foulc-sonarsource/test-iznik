import { Options } from './options';
/**
 * Creates and caches a directory that corresponds to `.scannerwork`-directory
 * (which in turn contains subdirectories with the UCFGs).
 */
export declare class ScannerworkDir {
    private readonly options;
    constructor(options: Options);
    private emitPath;
    /**
     * Converts UCFG identifier into a file path for the file in which the UCFG should
     * be saved.
     */
    ucfgFilePath(id: string): string;
    /** Unconditionally sets up a temporary directory and returns its path. */
    private tmpEmitDirPath;
    /**
     * If not already done, attempts to set up the emit directory at user-specified location.
     */
    private userDefinedEmitPath;
    /**
     * Attempts to set up a directory for the UCFG-files at the user-specified
     * location. If that fails, then it attempts to create a temporary directory
     * instead.
     */
    private emitDirPath;
}
