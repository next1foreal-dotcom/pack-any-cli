import path from "node:path";
import { adapters } from "../adapters/index.mjs";
import { assertDirectorySync, fs, fsSync } from "../utils/fs.mjs";

export async function detectProjectType(project) {
  assertDirectorySync(project, "Project path");

  for (const adapter of adapters) {
    if (adapter.canDetect && await adapter.canDetect(project)) return adapter.type;
    if (adapter.detectFiles) {
      for (const file of adapter.detectFiles) {
        if (fsSync.existsSync(path.join(project, file))) return adapter.type;
      }
    }
    if (adapter.detectExtensions) {
      const entries = await fs.readdir(project);
      if (entries.some((entry) => adapter.detectExtensions.includes(path.extname(entry)))) {
        return adapter.type;
      }
    }
  }
  return "unknown";
}
