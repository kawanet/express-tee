#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";

import {tee} from "../lib/express-tee";

const TITLE = __filename.split("/").pop();

const cachePrefix = __dirname + "/tmp/cache-" + Math.floor(+new Date() / 1000);

describe(TITLE, () => {
    {
        const path = "/head.html";
        it(path, async () => {
            const agent = getAgent();
            const HEAD = "1:HEAD";
            const GET = "3:GET";

            // content not cached by HEAD method
            await agent.head(path).expect("content-length", "" + HEAD.length);
            await agent.head(path + "?_=1588635019").expect("content-length", "" + HEAD.length);

            // content cached by GET method
            await agent.get(path).expect("content-length", "" + GET.length).expect(GET);
            await agent.get(path + "?_=1588635019").expect("content-length", "" + GET.length).expect(GET);

            await agent.head(path).expect("content-length", "" + GET.length);
            await agent.head(path + "?_=1588635019").expect("content-length", "" + GET.length);
        });
    }

    {
        const path = "/post.html";
        it(path, async () => {
            const agent = getAgent();
            const POST1 = "1:POST";
            const POST2 = "2:POST";

            // content cached by POST method
            await agent.post(path).expect("content-length", "" + POST1.length).expect(POST1);
            await agent.get(path).expect("content-length", "" + POST1.length).expect(POST1);

            // content overridden by POST method as express.static() passes it
            await agent.post(path).expect("content-length", "" + POST2.length).expect(POST2);
            await agent.get(path).expect("content-length", "" + POST2.length).expect(POST2);
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
        const body = (++cnt) + ":" + req.method;
        res.header("Content-Length", "" + (body.length));

        if (req.method === "HEAD") {
            res.end();
        } else {
            res.send(body);
        }
    }
}
