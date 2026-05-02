// 30.chunked — caching of responses written in multiple chunks.

import {describe, it} from "node:test";
import request from "supertest";

import {tee} from "../../lib/express-tee.ts";
import {cachePrefix, registerCleanup} from "./util.ts";
import type {ExpressFactory} from "./util.ts";

export function runChunkedTests(label: string, express: ExpressFactory): void {
    const prefix = cachePrefix(`${label}-chunked`);
    registerCleanup(prefix);

    describe(`${label}: 30.chunked`, () => {
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
            };
        }

        {
            const path = "/chunked.html";
            it(path, async () => {
                const agent = getAgent();
                const body = "1:/chunked.html";
                const length = "" + body.length;

                await agent.get(path).expect(body).expect("content-length", length);
                await agent.head(path).expect("content-length", length);

                await agent.get(path + "?_=1588635019").expect(body).expect("content-length", length);
                await agent.head(path + "?_=1588635019").expect("content-length", length);
            });
        }
    });
}
