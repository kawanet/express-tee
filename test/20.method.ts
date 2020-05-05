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
            const body = "1:GET";
            const length = "" + body.length

            // content cached even by HEAD method
            await agent.head(path).expect("content-length", length);
            await agent.head(path + "?_=1588635019").expect("content-length", length);

            // content cached by GET method
            await agent.get(path).expect(body).expect("content-length", length);
            await agent.get(path + "?_=1588635019").expect(body).expect("content-length", length);
        });
    }

    {
        const path = "/post.html";
        it(path, async () => {
            const agent = getAgent();
            const body1 = "1:POST";
            const length1 = "" + body1.length;
            const body2 = "2:POST";
            const length2 = "" + body2.length;

            // content cached by POST method
            await agent.post(path).expect(body1).expect("content-length", length1);
            await agent.get(path).expect(body1).expect("content-length", length1);

            // content overridden by POST method as express.static() passes it
            await agent.post(path).expect(body2).expect("content-length", length2);
            await agent.get(path).expect(body2).expect("content-length", length2);
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
