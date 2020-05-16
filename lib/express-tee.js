"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tee = void 0;
const fs_1 = require("fs");
const express_intercept_1 = require("express-intercept");
const defaults = {
    method: /^(?!HEAD)/,
    statusCode: /^(200)$/,
};
const pseudoHEAD = express_intercept_1.requestHandler()
    .for(req => req.method === "HEAD")
    .use(express_intercept_1.requestHandler().getRequest(req => req.method = "GET"), express_intercept_1.responseHandler().getRequest(req => req.method = "HEAD"));
function tee(root, options) {
    if (!options)
        options = {};
    const method = options.method || defaults.method;
    const statusCode = options.statusCode || defaults.statusCode;
    return express_intercept_1.requestHandler()
        .for(req => method.test(req.method))
        .use(pseudoHEAD, express_intercept_1.responseHandler().getBuffer(teeToFile));
    async function teeToFile(data, req, res) {
        if (!statusCode.test(res.statusCode))
            return;
        if (res.getHeader("content-range"))
            return;
        const path = getPath();
        if (options.logger)
            options.logger.log(path);
        const dir = path.replace(/[^\/]+$/, "");
        await fs_1.promises.mkdir(dir, { recursive: true });
        await fs_1.promises.writeFile(path, data);
        function getPath() {
            const url = req.originalUrl || req.url || req.path;
            let str = root + url;
            str = str.replace(/(\/[^\/]+)?\/\.\.\//g, "");
            str = str.replace(/[?#].*$/, "");
            if (str.search(/\/$/) > -1)
                str += getIndex();
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
exports.tee = tee;
