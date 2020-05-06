import { RequestHandler } from "express";
export interface TeeOptions {
    index?: string;
    logger?: {
        log: (message: string) => void;
    };
    method?: RegExp | string;
    statusCode?: RegExp | string;
}
export declare function tee(root: string, options?: TeeOptions): RequestHandler;
