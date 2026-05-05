// 40.status — caching keyed by HTTP status code (200 cached, 302/404 not).

import {describe, it} from "node:test";
import request from "supertest";

import {tee} from "../../lib/express-tee.ts";
import {cachePrefix, registerCleanup, type ExpressModule} from "./util.ts";

export function runStatusTests(label: string, express: ExpressModule): void {
    const prefix = cachePrefix(`${label}-status`);
    registerCleanup(prefix);

    describe(`${label}: 40.status`, () => {
        const getAgent = () => {
            const app = express();
            app.use(express.static(prefix));
            app.use(tee(prefix));
            app.get("/:status.html", sampleAPI());
            return request(app);
        };

        function sampleAPI() {
            let cnt = 0;
            return (req: any, res: any) => {
                cnt++;
                const {status} = req.params;
                res.status(+status).type("html");
                res.header({"X-Count": "" + cnt});

                const body = cnt + ":" + req.path;
                if (+status !== 302) {
                    res.send(body);
                } else {
                    res.end();
                }
            };
        }

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
}
