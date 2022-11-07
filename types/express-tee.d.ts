import type {RequestHandler} from "express";

export declare interface TeeOptions {
    /// index.html
    index?: string;

    /// console.log
    logger?: { log: (message: string) => void };

    /// HTTP request method: regexp or forward match string
    method?: RegExp | { test: (str: string) => boolean };

    /// HTTP response status code: regexp or forward match string
    statusCode?: RegExp | { test: (str: string) => boolean };
}

export declare const tee: (root: string, options?: TeeOptions) => RequestHandler;
