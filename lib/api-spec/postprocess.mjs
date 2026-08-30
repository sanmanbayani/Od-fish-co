/**
 * Post-codegen normalizer.
 *
 * Orval 8 emits zod v4 syntax (`zod.int()`), but this workspace pins zod 3.x
 * where the equivalent is `zod.number().int()`. Rewrite the generated zod
 * schemas so they compile against the pinned version. Runs on every codegen.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.resolve(here, "..", "api-zod", "src", "generated");

const REWRITES = [
  [/\bzod\.int\(/g, "zod.number().int("],
  // zod v4 exposes top-level string formats (`zod.email()`); v3 chains them off
  // `zod.string()`. Applies to every `format:` orval knows, hence the list.
  [/\bzod\.email\(\)/g, "zod.string().email()"],
  [/\bzod\.url\(\)/g, "zod.string().url()"],
  [/\bzod\.uuid\(\)/g, "zod.string().uuid()"],
];

const entries = await readdir(generatedDir, { withFileTypes: true, recursive: true });
let patched = 0;

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
  const filePath = path.join(entry.parentPath ?? generatedDir, entry.name);
  const original = await readFile(filePath, "utf8");
  const next = REWRITES.reduce((acc, [from, to]) => acc.replace(from, to), original);
  if (next !== original) {
    await writeFile(filePath, next, "utf8");
    patched += 1;
  }
}

console.log(`[api-spec] normalized zod output in ${patched} file(s)`);
