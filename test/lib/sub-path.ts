// 50.sub-path — mounting under nested paths preserves originalUrl-based caching.

import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import request from "supertest";

import {tee} from "../../lib/express-tee.ts";
import {cachePrefix, registerCleanup} from "./util.ts";
import type {ExpressFactory} from "./util.ts";

export function runSubPathTests(label: string, express: ExpressFactory): void {
    const prefix = cachePrefix(`${label}-sub-path`);
    registerCleanup(prefix);

    describe(`${label}: 50.sub-path`, () => {
        const getAgent = () => {
            const app = express();
            app.use(express.static(prefix));
            app.use(tee(prefix));

            app.use("/foo/bar/", echoMW("/foo/bar/"));
            app.use("/foo/", echoMW("/foo/"));
            app.use(echoMW("(root)"));
            return request(app);
        };

        function echoMW(key: string) {
            let cnt = 0;
            return (req: any, res: any) => {
                res.send(`${key} [#${++cnt}] ${req.originalUrl}`);
            };
        }

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
    });
}
