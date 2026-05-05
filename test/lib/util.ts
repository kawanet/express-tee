// Common helpers for the per-topic test runners.

import {before, after} from "node:test";
import * as os from "node:os";
import {promises as fs} from "node:fs";

// Express factory shape that includes both the call signature and the
// namespace methods (`.static`, `.Router`, `.json`, ...) the runners
// reach for. Express ships as a CommonJS `export = e` namespace, so
// `typeof import("express")` resolves to the value of `import express
// from "express"` directly (no `.default`).
export type ExpressModule = typeof import("express");

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
