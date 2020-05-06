// express-tee.ts

import * as express from "express";
import {gunzip, inflate} from "zlib";
import {promises as fs} from "fs";
import {promisify} from "util";

const enum status {
    OK = 200,
    INTERNAL_SERVER_ERROR = 500,
}

export interface TeeOptions {
    index?: string; // index.html
}

type numMap = { [type: string]: number };
type decoderFn = (buffer: Buffer) => Promise<Buffer>;

const removeHeaders: numMap = {
    "if-match": 1,
    "if-modified-since": 1,
    "if-none-match": 1,
    "if-unmodified-since": 1,
    "range": 1,
};

const decoders = {
    gzip: promisify(gunzip),
    deflate: promisify(inflate),
} as { [encoding: string]: decoderFn };

export function tee(root: string, options?: TeeOptions): express.RequestHandler {

    return async (req, res, next) => {
        const _write = res.write;
        const _end = res.end;
        const buffer = [] as Buffer[];

        const _method = req.method;
        const isHEAD = (_method === "HEAD");
        if (isHEAD) req.method = "GET";

        // remove conditional request headers
        Object.keys(removeHeaders).forEach(key => delete req.headers[key]);

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
                res.status(status.INTERNAL_SERVER_ERROR);
                _end.call(res, cb);
            });
        };

        next();

        async function writeCache(data: Buffer) {
            const actual = +(data && data.length);
            const expected = +res.getHeader("content-length");
            const isValid = !!actual || actual === expected;
            if (!isValid) return;

            // OK response only
            if (+res.statusCode !== status.OK) return;

            // uncompress Buffer
            data = await uncompressBody(res, data);

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

    async function uncompressBody(res: express.Response, buffer: Buffer): Promise<Buffer> {
        const contentEncoding = res.getHeader("content-encoding") as string;
        const transferEncoding = res.getHeader("transfer-encoding") as string;
        const decoder = decoders[contentEncoding] || decoders[transferEncoding];

        if (decoder && buffer.length) {
            buffer = await decoder(buffer);
            res.removeHeader("content-encoding");
            res.removeHeader("transfer-encoding");
        }

        return buffer;
    }
}