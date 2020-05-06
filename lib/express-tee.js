"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zlib_1 = require("zlib");
const fs_1 = require("fs");
const util_1 = require("util");
const removeHeaders = {
    "if-match": 1,
    "if-modified-since": 1,
    "if-none-match": 1,
    "if-unmodified-since": 1,
    "range": 1,
};
const decoders = {
    gzip: util_1.promisify(zlib_1.gunzip),
    deflate: util_1.promisify(zlib_1.inflate),
};
function tee(root, options) {
    if (!options)
        options = {};
    return async (req, res, next) => {
        const _write = res.write;
        const _end = res.end;
        const buffer = [];
        const _method = req.method;
        const isHEAD = (_method === "HEAD");
        if (isHEAD)
            req.method = "GET";
        Object.keys(removeHeaders).forEach(key => delete req.headers[key]);
        res.write = function (chunk, encoding, cb) {
            if (chunk != null)
                buffer.push(chunk);
            if (isHEAD) {
                cb = getCallback(arguments);
                if (cb)
                    cb();
                return true;
            }
            return _write.apply(res, arguments);
        };
        res.end = function (chunk, encoding, cb) {
            const args = [].slice.call(arguments);
            if (chunk && "function" !== typeof chunk) {
                buffer.push(chunk);
            }
            buffer.forEach((item, idx) => {
                if ("string" === typeof item) {
                    buffer[idx] = Buffer.from(item);
                }
            });
            Promise.resolve(Buffer.concat(buffer)).then(writeCache).then(() => {
                if (isHEAD)
                    return _end.call(res, getCallback(args));
                _end.apply(res, args);
            }, (e) => {
                res.status(500);
                _end.call(res, cb);
            });
        };
        next();
        async function writeCache(data) {
            const actual = +(data && data.length);
            const expected = +res.getHeader("content-length");
            const isValid = !!actual || actual === expected;
            if (!isValid)
                return;
            if (+res.statusCode !== 200)
                return;
            data = await uncompressBody(res, data);
            const path = cachePathFilter(root + req.url);
            if (options.logger)
                options.logger.log(path);
            const dir = path.replace(/[^\/]+$/, "");
            await fs_1.promises.mkdir(dir, { recursive: true });
            await fs_1.promises.writeFile(path, data);
        }
    };
    function cachePathFilter(str) {
        str = str.replace(/(\/[^\/]+)?\/\.\.\//, "");
        str = str.replace(/[?#].*$/, "");
        const index = options && options.index || "index.html";
        if (str.search(/\/$/) > -1)
            str += index;
        return str;
    }
    function getCallback(args) {
        const cb = args[args.length - 1];
        if ("function" === typeof cb)
            return cb;
    }
    async function uncompressBody(res, buffer) {
        const contentEncoding = res.getHeader("content-encoding");
        const transferEncoding = res.getHeader("transfer-encoding");
        const decoder = decoders[contentEncoding] || decoders[transferEncoding];
        if (decoder && buffer.length) {
            buffer = await decoder(buffer);
            res.removeHeader("content-encoding");
            res.removeHeader("transfer-encoding");
        }
        return buffer;
    }
}
exports.tee = tee;
