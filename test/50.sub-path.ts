#!/usr/bin/env mocha -R spec

import {strict as assert} from "assert";
import express from "express";
import * as os from "node:os";
import request from "supertest";

import {tee} from "../";

const cachePrefix = os.tmpdir() + "/express-tee-" + process.pid;

describe("50.sub-path.ts", () => {
    const agent = getAgent();

    const addTest = (path: string, expected: string) => {
        it(path, async () => {
            const res = await agent.get(path);
            assert.equal(res.text, expected);
            assert.equal(String(res.header["content-type"]).toLowerCase(), "text/html; charset=utf-8");

            // confirm cached
            await agent.get(path).expect(expected);
            await agent.get(path + "?_=1588635019").expect(expected);
        });
    };

    addTest("/xxx.html", "(root) [#1] /xxx.html");
    addTest("/foo/xxx.html", "/foo/ [#1] /foo/xxx.html");
    addTest("/foo/bar/xxx.html", "/foo/bar/ [#1] /foo/bar/xxx.html");
})

function getAgent() {
    const app = express();
    // app.use((req, res, next) => +console.warn(req.url) | +next());
    app.use(express.static(cachePrefix));
    app.use(tee(cachePrefix));

    app.use("/foo/bar/", echoMW("/foo/bar/"));
    app.use("/foo/", echoMW("/foo/"));
    app.use(echoMW("(root)"));
    return request(app);
}

function echoMW(key: string): express.RequestHandler {
    let cnt = 0;
    return (req, res, next) => {
        res.send(`${key} [#${++cnt}] ${req.originalUrl}`);
    }
}
