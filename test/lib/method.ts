// 20.method — caching keyed by HTTP method (HEAD / GET / POST).

import {describe, it} from "node:test";
import request from "supertest";

import {tee} from "../../lib/express-tee.ts";
import {cachePrefix, registerCleanup} from "./util.ts";
import type {ExpressFactory} from "./util.ts";

export function runMethodTests(label: string, express: ExpressFactory): void {
    const prefix = cachePrefix(`${label}-method`);
    registerCleanup(prefix);

    describe(`${label}: 20.method`, () => {
        const getAgent = () => {
            const app = express();
            app.use(express.static(prefix));
            app.use(tee(prefix, {method: /HEAD|GET|POST/}));
            app.use(echoMW());
            return request(app);
        };

        function echoMW() {
            let cnt = 0;
            return (req: any, res: any) => {
                const body = (++cnt) + ":" + req.method;
                res.header("Content-Length", "" + (body.length));

                if (req.method === "HEAD") {
                    res.end();
                } else {
                    res.send(body);
                }
            };
        }

        {
            const path = "/head/";
            it(path, async () => {
                const agent = getAgent();
                const body = "1:GET";
                const length = "" + body.length;

                // content cached even by HEAD method
                await agent.head(path).expect("content-length", length);
                await agent.head(path + "?_=1588635019").expect("content-length", length);

                // content cached by GET method
                await agent.get(path).expect(body).expect("content-length", length);
                await agent.get(path + "?_=1588635019").expect(body).expect("content-length", length);
            });
        }

        {
            const path = "/post/";
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
}
