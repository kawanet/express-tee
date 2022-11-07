#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";

import {tee} from "../";

const TITLE = __filename.split("/").pop();

const cachePrefix = __dirname + "/tmp/cache-" + Math.floor(+new Date() / 1000);

describe(TITLE, () => {
    {
        const path = "/chunked.html";
        it(path, async () => {
            const agent = getAgent();
            const body = "1:/chunked.html";
            const length = "" + body.length

            await agent.get(path).expect(body).expect("content-length", length);
            await agent.head(path).expect("content-length", length);

            await agent.get(path + "?_=1588635019").expect(body).expect("content-length", length);
            await agent.head(path + "?_=1588635019").expect("content-length", length);
        });
    }
});

function getAgent() {
    const app = express();
    app.use(express.static(cachePrefix));
    app.use(tee(cachePrefix));
    app.use(echoMW());
    return request(app);
}

function echoMW(): express.RequestHandler {
    let cnt = 0;
    return (req, res, next) => {
        const body = (++cnt) + ":" + req.url;
        const queue = [].slice.call(body);

        res.status(200);
        res.type("text/html");
        res.header("Content-Length", "" + Buffer.from(body).length);
        writeChunk();

        function writeChunk() {
            const chunk = queue.shift();
            if (queue.length) {
                res.write(chunk, writeChunk);
            } else {
                res.end(chunk);
            }
        }
    }
}
