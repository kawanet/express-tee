// express-tee.ts

import {promises as fs} from "fs";
import {Request, RequestHandler, Response} from "express";

import {requestHandler, responseHandler} from "express-intercept";

type Tester = { test: (str: any) => boolean };

export interface TeeOptions {
    /// index.html
    index?: string;

    /// console.log
    logger?: { log: (message: string) => void };

    /// HTTP request method: regexp or forward match string
    method?: RegExp | string;

    /// HTTP response status code: regexp or forward match string
    statusCode?: RegExp | string;
}

const defaults: TeeOptions = {
    // exclude HEAD method per default
    method: /^(?!HEAD)/,

    // OK response only per default
    statusCode: "200",
};

const makeTester = (cond: RegExp | string): Tester => !cond ? {test: () => true} : (cond as RegExp).test ? (cond as RegExp) : {test: str => !String(str).indexOf(cond as string)};

const pseudoHEAD = requestHandler()
    .for(req => req.method === "HEAD") // only for HEAD
    .use(
        requestHandler().getRequest(req => req.method = "GET"), // set GET
        responseHandler().getRequest(req => req.method = "HEAD") // revert to HEAD
    );

export function tee(root: string, options?: TeeOptions): RequestHandler {
    if (!options) options = {} as TeeOptions;

    const method = makeTester(options.method || defaults.method);

    const statusCode = makeTester(options.statusCode || defaults.statusCode);

    return requestHandler()
        .for(req => method.test(req.method))
        .use(
            pseudoHEAD,
            responseHandler().getBuffer(teeToFile),
        );

    async function teeToFile(data: Buffer, req: Request, res: Response) {
        // if (+res.statusCode === 200) return;
        if (!statusCode.test(res.statusCode)) return;

        // ignore when Range: specified
        if (res.getHeader("content-range")) return;

        // file path
        const path = getPath();
        if (options.logger) options.logger.log(path);

        // prepare directory
        const dir = path.replace(/[^\/]+$/, "");
        await fs.mkdir(dir, {recursive: true});

        // write file
        await fs.writeFile(path, data);

        function getPath() {
            const url = req.originalUrl || req.url || req.path;
            let str = root + url;
            str = str.replace(/(\/[^\/]+)?\/\.\.\//g, "");
            str = str.replace(/[?#].*$/, "");
            if (str.search(/\/$/) > -1) str += getIndex();
            return str;
        }

        function getIndex() {
            return options && options.index || ("index." + getType());
        }

        function getType() {
            const type = "" + res.getHeader("content-type");
            return type.split(/[\/\s;]+/)[1] || "html";
        }
    }
}
