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

        const _method = req.method;
        const isHEAD = (_method === "HEAD");
        if (isHEAD) req.method = "GET";

        // retrieve a chunk
        res.write = function (chunk: any, encoding?: any, cb?: any) {
            if (chunk != null) buffer.push(chunk);

            if (isHEAD) {
                cb = getCallback(arguments);
                if (cb) cb();
                return true;
            }

            return _write.apply(res, arguments);
        };

        // retrieve the last chunk
        res.end = function (chunk?: any, encoding?: any, cb?: any) {
            const args = [].slice.call(arguments);

            if (chunk && "function" !== typeof chunk) {
                buffer.push(chunk);
            }

            buffer.forEach((item: Buffer, idx: number) => {
                if ("string" === typeof item) {
                    buffer[idx] = Buffer.from(item);
                }
            });

            Promise.resolve(Buffer.concat(buffer)).then(writeCache).then(() => {
                if (isHEAD) return _end.call(res, getCallback(args));
                _end.apply(res, args);
            }, (e) => {
                res.status(500); // Internal Server Error
                _end.call(res, cb);
            });
        };

        next();

        async function writeCache(data: Buffer) {
            const actual = +(data && data.length);
            const expected = +res.getHeader("content-length");
            const isValid = !!actual || actual === expected;
            if (!isValid) return;

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

    function getCallback(args: IArguments) {
        const cb = args[args.length - 1];
        if ("function" === typeof cb) return cb;
    }
}