#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";

import {tee} from "../lib/express-tee";

const TITLE = __filename.split("/").pop();

const cachePrefix = __dirname + "/tmp/cache-" + Math.floor(+new Date() / 1000);

describe(TITLE, () => {
    const match = "etag";
    const range = "bytes=0-2";
    const headers = {
        "If-None-Match": match,
        "Range": range,
    };

    {
        const path = "/without-tee/without-condition/";
        it(path, async () => {
            const agent = getAgent();
            await agent.get(path).expect(["1", "-", "-"].join("/"));
            await agent.get(path).expect(["2", "-", "-"].join("/"));
        });
    }
    {
        const path = "/without-tee/with-condition/";
        it(path, async () => {
            const agent = getAgent();
            await agent.get(path).set(headers).expect(["1", match, range].join("/"));
            await agent.get(path).set(headers).expect(["2", match, range].join("/"));
        });
    }
    {
        const path = "/with-tee/without-condition/";
        it(path, async () => {
            const agent = getAgent();
            const expected = ["1", "-", "-"].join("/");
            await agent.get(path).expect(expected);
            await agent.get(path).expect(expected); // cached
        });
    }
    {
        const path = "/with-tee/with-condition/";
        it(path, async () => {
            const agent = getAgent();
            const expected = ["1", "-", "-"].join("/");
            await agent.get(path).set(headers).expect(expected);
            await agent.get(path).set(headers).expect(expected.substr(0, 3)); // condition applied
        });
    }
});

function getAgent() {
    const app = express();
    app.use(express.static(cachePrefix));
    app.get("/without-tee/:cond", sampleAPI());
    app.use(tee(cachePrefix));
    app.get("/with-tee/:cond", sampleAPI());
    return request(app);
}

function sampleAPI(): express.RequestHandler {
    let cnt = 0;

    return (req, res, next) => {
        const match = req.header("if-none-match") || "-";
        const range = req.headers["range"] || "-";
        const body = [++cnt, match, range].join("/");
        res.type("html").send(body);
    };
}
