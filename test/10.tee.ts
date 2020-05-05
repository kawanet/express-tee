#!/usr/bin/env mocha -R spec

import {strict as assert} from "assert";
import * as express from "express";
import * as request from "supertest";

import {tee} from "../lib/express-tee";

const TITLE = __filename.split("/").pop();

const cachePrefix = __dirname + "/tmp/cache-" + Math.floor(+new Date() / 1000);

describe(TITLE, () => {
    {
        const path = "/foo.html";
        it(path, async () => {
            const agent = getAgent();
            const res = await agent.get(path);
            const expected = "1:/foo.html";
            assert.equal(res.text, expected);
            assert.equal(res.header["content-type"]?.toLowerCase(), "text/html; charset=utf-8");

            // confirm cached
            await agent.get(path).expect(expected);
            await agent.get(path + "?_=1588635019").expect(expected);
        });
    }

    {
        const path = "/foo/";
        it(path, async () => {
            const agent = getAgent();
            const res = await agent.get(path);
            const expected = "1:/foo/";
            assert.equal(res.text, expected);
            assert.equal(res.header["content-type"]?.toLowerCase(), "text/html; charset=utf-8");

            // confirm cached
            await agent.get(path).expect(expected);
            await agent.get(path + "?_=1588635019").expect(expected);
        });
    }

    {
        const path = "/bar.html?_=1588635019";
        it(path, async () => {
            const agent = getAgent();
            const res = await agent.get(path);
            const expected = "1:/bar.html?_=1588635019";
            assert.equal(res.text, expected);
            assert.equal(res.header["content-type"]?.toLowerCase(), "text/html; charset=utf-8");

            // confirm cached
            await agent.get(path.replace(/\d+/, match => (+match + 1) + "")).expect(expected);
            await agent.get(path.replace(/\d+/, match => (+match + 2) + "")).expect(expected);
        });
    }
});

function getAgent() {
    const app = express();
    // app.use((req, res, next) => +console.warn(req.url) | +next());
    app.use(express.static(cachePrefix));
    app.use(tee(cachePrefix));
    app.use(echoMW());
    return request(app);
}

function echoMW(): express.RequestHandler {
    let cnt = 0;
    return (req, res, next) => {
        res.send((++cnt) + ":" + req.url);
    }
}
