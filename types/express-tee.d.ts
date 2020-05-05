import * as express from "express";
interface TeeOptions {
    index?: string;
}
export declare function tee(root: string, options?: TeeOptions): express.RequestHandler;
export {};
