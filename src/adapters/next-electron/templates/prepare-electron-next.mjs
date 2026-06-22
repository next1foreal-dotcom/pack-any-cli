import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");
const electronNextDir = path.join(root, ".electron-next");
const staticSource = path.join(root, ".next", "static");
const staticTarget = path.join(electronNextDir, ".next", "static");
const publicSource = path.join(root, "public");
const publicTarget = path.join(electronNextDir, "public");

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyIfPresent(source, target) {
  if (!(await exists(source))) return;
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, { recursive: true });
}

if (!(await exists(path.join(standaloneDir, "server.js")))) {
  throw new Error("Missing .next/standalone/server.js. Set next.config output to 'standalone' and run next build first.");
}

await fs.rm(electronNextDir, { recursive: true, force: true });
await fs.cp(standaloneDir, electronNextDir, { recursive: true });
await copyIfPresent(staticSource, staticTarget);
await copyIfPresent(publicSource, publicTarget);

console.log("Electron Next assets prepared");
