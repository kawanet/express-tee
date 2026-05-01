// shared.ts —— Express 4 / Express 5 を切り替えて回す共通テストロジック

import {strict as assert} from "node:assert";
import {describe, it, before, after} from "node:test";
import * as os from "node:os";
import {promises as fs} from "node:fs";
import request from "supertest";

import {tee} from "../../lib/express-tee.ts";

// Express 4/5 双方の最小限の型を満たすラッパ。`express()` 関数として使えれば良い。
type ExpressFactory = any;

// 各バージョンごとに異なる pid 由来のキャッシュ prefix を使い、テスト実行間で衝突しないようにする
const cachePrefix = (suffix: string) =>
    `${os.tmpdir()}/express-tee-${process.pid}-${suffix}`;

/**
 * テスト本体を Express バージョンごとにまとめて登録する。
 * label には "express4" / "express5" などを渡す。
 */
export function registerSharedTests(label: string, express: ExpressFactory): void {
    const prefix = cachePrefix(label);

    // テスト前後で tmp ディレクトリを掃除
    before(async () => {
        await fs.rm(prefix, {recursive: true, force: true});
    });
    after(async () => {
        await fs.rm(prefix, {recursive: true, force: true});
    });

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
