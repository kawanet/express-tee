"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
function tee(root, options) {
    return async (req, res, next) => {
        const _write = res.write;
        const _end = res.end;
        const buffer = [];
        res.write = function (chunk, encoding, cb) {
            if (chunk != null)
                buffer.push(chunk);
            return _write.call(res, arguments);
        };
        res.end = function (chunk, encoding, cb) {
            const args = [].slice.call(arguments);
            if ("function" === typeof chunk) {
                args.unshift(chunk = null);
            }
            if (chunk != null)
                buffer.push(chunk);
            Promise.resolve(Buffer.concat(buffer)).then(writeCache).then(() => {
                _end.apply(res, args);
            }, (e) => {
                res.status(500);
                _end.call(res, cb);
            });
        };
        next();
        async function writeCache(data) {
            const path = cachePathFilter(root + req.url);
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
}
exports.tee = tee;
