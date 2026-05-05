// Integration tests for the Express 5 line.

import express5 from "express5";

import {runTeeTests} from "./lib/tee.ts";
import {runMethodTests} from "./lib/method.ts";
import {runChunkedTests} from "./lib/chunked.ts";
import {runStatusTests} from "./lib/status.ts";
import {runSubPathTests} from "./lib/sub-path.ts";
import type {ExpressFactory} from "./lib/util.ts";

const label = "express5";

// Runtime tests cover both Express 4 and 5. Type-level dual coverage
// is intentionally out of scope, so this cast pins express5 to the
// Express 4 baseline that the shared runners type-check against.
const express = express5 as unknown as ExpressFactory;

runTeeTests(label, express);
runMethodTests(label, express);
runChunkedTests(label, express);
runStatusTests(label, express);
runSubPathTests(label, express);
