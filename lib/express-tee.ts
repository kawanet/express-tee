// express-tee.ts

import * as express from "express";
import {promises as fs} from "fs";

interface TeeOptions {
    index?: string; // index.html
}

export function tee(root: string, options?: TeeOptions): express.RequestHandler {

    return async (req, res, next) => {
        const _write = res.write;
        const _end = res.end;
        const buffer = [] as Buffer[];

        // retrieve a chunk
        res.write = function (chunk: any, encoding?: any, cb?: any) {
            if (chunk != null) buffer.push(chunk);
            return _write.call(res, arguments);
        };

        // retrieve the last chunk
        res.end = function (chunk?: any, encoding?: any, cb?: any) {
            const args = [].slice.call(arguments);
            if ("function" === typeof chunk) {
                args.unshift(chunk = null);
            }

            if (chunk != null) buffer.push(chunk);
            Promise.resolve(Buffer.concat(buffer)).then(writeCache).then(() => {
                _end.apply(res, args);
            }, (e) => {
                res.status(500); // Internal Server Error
                _end.call(res, cb);
            });
        };

        next();

        async function writeCache(data: Buffer) {
            const path = cachePathFilter(root + req.url);
            const dir = path.replace(/[^\/]+$/, "");
            await fs.mkdir(dir, {recursive: true});
            await fs.writeFile(path, data);
        }
    }

    function cachePathFilter(str: string) {
        str = str.replace(/(\/[^\/]+)?\/\.\.\//, "");
        str = str.replace(/[?#].*$/, "");
        const index = options && options.index || "index.html";
        if (str.search(/\/$/) > -1) str += index;
        return str;
    }
}