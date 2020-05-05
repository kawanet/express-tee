#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";

import {tee} from "../lib/express-tee";

const TITLE = __filename.split("/").pop();

const cachePrefix = __dirname + "/tmp/cache-" + Math.floor(+new Date() / 1000);

describe(TITLE, () => {
    {
        const path = "/200.html";
        it(path, async () => {
            const agent = getAgent();
            await agent.get(path).expect(200, "1:/200.html").expect("x-count", "1");
            await agent.get(path).expect(200, "1:/200.html"); // cached
        });
    }
    {
        const path = "/302.html";
        it(path, async () => {
            const agent = getAgent();
            await agent.get(path).expect(302).expect("x-count", "1");
            await agent.get(path).expect(302).expect("x-count", "2");
        });
    }
    {
        const path = "/404.html";
        it(path, async () => {
            const agent = getAgent();
            await agent.get(path).expect(404, "1:/404.html").expect("x-count", "1");
            await agent.get(path).expect(404, "2:/404.html").expect("x-count", "2");
        });
    }
});

function getAgent() {
    const app = express();
    app.use(express.static(cachePrefix));
    app.use(tee(cachePrefix));
    app.get("/:status.html", sampleAPI());
    return request(app);
}

function sampleAPI(): express.RequestHandler {
    let cnt = 0;

    return (req, res, next) => {
        cnt++;
        const {status} = req.params as any;
        res.status(status).type("html");
        res.header({"X-Count": "" + cnt});

        const body = cnt + ":" + req.path;
        if (+status !== 302) {
            res.send(body);
        } else {
            res.end();
        }
    };
}
