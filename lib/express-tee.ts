// express-tee.ts

import type {Request, Response} from "express";
import {requestHandler, responseHandler} from "express-intercept";
import {promises as fs} from "fs";
import type * as types from "../types/express-tee";

type TeeOptions = types.TeeOptions;
type tee = typeof types.tee;

const defaults: TeeOptions = {
    // exclude HEAD method per default
    method: /^(?!HEAD)/,

    // OK response only per default
    statusCode: /^(200)$/,
};

const pseudoHEAD = requestHandler()
    .for(req => req.method === "HEAD") // only for HEAD
    .use(
        requestHandler().getRequest(req => req.method = "GET"), // set GET
        responseHandler().getRequest(req => req.method = "HEAD") // revert to HEAD
    );

export const tee: tee = (root, options) => {
    if (!options) options = {} as types.TeeOptions;

    const method = options.method || defaults.method;

    const statusCode = options.statusCode || defaults.statusCode;

    // trailing slash
    root = root.replace(/\/+$/, "");

    return requestHandler()
        .for(req => method.test(req.method))
        .use(
            pseudoHEAD,
            responseHandler().getBuffer(teeToFile),
        );

    async function teeToFile(data: Buffer, req: Request, res: Response) {
        // if (+res.statusCode === 200) return;
        if (!statusCode.test(String(res.statusCode))) return;

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
            let str = req.originalUrl || req.url || req.path;

            str = str.replace(/[?#].*$/, "");

            // decode %25 => %
            // same as `express.static()` does `decodeURIComponent(path)` in `send` module
            // https://github.com/pillarjs/send/blob/master/index.js
            str = decodeURIComponent(str);

            // upper directory
            while (1) {
                let prev = str;
                str = str.replace(/\/\.\//g, "/");
                str = str.replace(/(\/[^\/]+)?\/\.\.\//g, "/");
                if (prev === str) break;
            }

            if (str.search(/\/$/) > -1) str += getIndex();
            str = str.replace(/^\/+/, "");
            return root + "/" + str;
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
