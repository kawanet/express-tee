// Common helpers for the per-topic test runners.

import {before, after} from "node:test";
import * as os from "node:os";
import {promises as fs} from "node:fs";

// Wrapper that matches the minimal shape of both Express 4 and 5; only
// needs to be callable as `express()`.
export type ExpressFactory = any;

// Use a pid- and label-derived cache prefix so concurrent test runs and
// the two Express versions never collide on the same tmp directory.
export const cachePrefix = (suffix: string): string =>
    `${os.tmpdir()}/express-tee-${process.pid}-${suffix}`;

// Register before/after hooks that wipe the tmp directory used by a topic.
export function registerCleanup(prefix: string): void {
    before(async () => {
        await fs.rm(prefix, {recursive: true, force: true});
    });
    after(async () => {
        await fs.rm(prefix, {recursive: true, force: true});
    });
}
