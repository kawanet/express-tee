// 10.tee — basic caching of plain GET responses.

import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import request from "supertest";

import {tee} from "../../lib/express-tee.ts";
import {cachePrefix, registerCleanup} from "./util.ts";
import type {ExpressFactory} from "./util.ts";

export function runTeeTests(label: string, express: ExpressFactory): void {
    const prefix = cachePrefix(`${label}-tee`);
    registerCleanup(prefix);

    describe(`${label}: 10.tee`, () => {
        const getAgent = () => {
            const app = express();
            app.use(express.static(prefix));
            app.use(tee(prefix));
            app.use(echoMW());
            return request(app);
        };

        function echoMW() {
            let cnt = 0;
            return (req: any, res: any) => {
                res.send((++cnt) + ":" + req.url);
            };
        }

        {
            const path = "/foo.html";
            it(path, async () => {
                const agent = getAgent();
                const res = await agent.get(path);
                const expected = "1:/foo.html";
                assert.equal(res.text, expected);
                assert.equal(String(res.header["content-type"]).toLowerCase(), "text/html; charset=utf-8");

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
                assert.equal(String(res.header["content-type"]).toLowerCase(), "text/html; charset=utf-8");

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
                assert.equal(String(res.header["content-type"]).toLowerCase(), "text/html; charset=utf-8");

                // confirm cached
                await agent.get(path.replace(/\d+/, match => (+match + 1) + "")).expect(expected);
                await agent.get(path.replace(/\d+/, match => (+match + 2) + "")).expect(expected);
            });
        }

        {
            const path = "/%25.html";
            it(path, async () => {
                const agent = getAgent();
                const expected = "1:/%25.html";
                await agent.get(path).expect(res => assert.equal(res.text, expected));

                // confirm cached
                await agent.get(path).expect(res => assert.equal(res.text, expected));
            });
        }
    });
}
