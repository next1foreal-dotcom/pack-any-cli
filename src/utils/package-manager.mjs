import path from "node:path";
import { existsSync } from "./fs.mjs";

export function packageManager(project) {
  if (existsSync(path.join(project, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(project, "yarn.lock"))) return "yarn";
  return "npm";
}
