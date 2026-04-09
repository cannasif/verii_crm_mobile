import { existsSync, readdirSync, rmSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const customerRoot = join(projectRoot, "src", "features", "customer");
const outDir = join(tmpdir(), "verii_crm_mobile_business_card_tests");
const tscCli = join(projectRoot, "node_modules", "typescript", "lib", "tsc.js");
const skippedTests = new Set([
  "businessCardTranslationService.test.ts",
]);

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath.endsWith(".test.ts") ? [fullPath] : [];
  });
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_PATH: join(projectRoot, "node_modules"),
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const testFiles = walk(customerRoot)
  .filter((file) => !skippedTests.has(basename(file)))
  .sort();

if (testFiles.length === 0) {
  console.error("No business card tests found.");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });

run(process.execPath, [
  tscCli,
  "--target",
  "es2020",
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--jsx",
  "react-jsx",
  "--esModuleInterop",
  "--skipLibCheck",
  "--resolveJsonModule",
  "--outDir",
  outDir,
  ...testFiles.map((file) => relative(projectRoot, file)),
]);

for (const testFile of testFiles) {
  const compiledCandidates = [
    join(outDir, relative(projectRoot, testFile)).replace(/\.ts$/, ".js"),
    join(outDir, "customer", relative(customerRoot, testFile)).replace(/\.ts$/, ".js"),
  ];
  const compiledFile = compiledCandidates.find((candidate) => existsSync(candidate));

  if (!compiledFile) {
    console.error(`Compiled test file not found for ${testFile}`);
    process.exit(1);
  }

  run("node", [compiledFile]);
}

console.log(`business card test suite passed (${testFiles.length} files)`);
