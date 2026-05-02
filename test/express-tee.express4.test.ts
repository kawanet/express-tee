// Integration tests for the Express 4 line.

import express from "express4";

import {runTeeTests} from "./lib/tee.ts";
import {runMethodTests} from "./lib/method.ts";
import {runChunkedTests} from "./lib/chunked.ts";
import {runStatusTests} from "./lib/status.ts";
import {runSubPathTests} from "./lib/sub-path.ts";

const label = "express4";

runTeeTests(label, express);
runMethodTests(label, express);
runChunkedTests(label, express);
runStatusTests(label, express);
runSubPathTests(label, express);
