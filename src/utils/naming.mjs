import path from "node:path";
import { existsSync, fsSync } from "./fs.mjs";

export function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
}

export function titleCase(value) {
  return String(value).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function projectName(project) {
  const packageJsonPath = path.join(project, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fsSync.readFileSync(packageJsonPath, "utf8"));
      return slugify(pkg.build?.productName || pkg.name || path.basename(project));
    } catch {
      // Fall back to directory name.
    }
  }
  return slugify(path.basename(project));
}
