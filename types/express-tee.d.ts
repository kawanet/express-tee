import { RequestHandler } from "express";
declare type Tester = {
    test: (str: any) => boolean;
};
export interface TeeOptions {
    index?: string;
    logger?: {
        log: (message: string) => void;
    };
    method?: RegExp | Tester;
    statusCode?: RegExp | Tester;
}
export declare function tee(root: string, options?: TeeOptions): RequestHandler;
export {};
