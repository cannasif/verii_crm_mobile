import assert from "node:assert/strict";
import { runBusinessCardBenchmark, summarizeBusinessCardBenchmark } from "./businessCardBenchmarkRunner";

const results = runBusinessCardBenchmark();
const summary = summarizeBusinessCardBenchmark(results);
assert.ok(summary.total >= 3, "benchmark should include fixtures");
assert.equal(summary.failed, 0, "current benchmark fixtures should pass");

console.log("businessCardBenchmarkRunner test passed");
