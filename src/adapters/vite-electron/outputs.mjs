import path from "node:path";
import { fsSync, readJson } from "../../utils/fs.mjs";

export async function printViteElectronOutputs(project) {
  const pkg = await readJson(path.join(project, "package.json"));
  const outputDir = path.join(project, pkg.build?.directories?.output || "release");
  const outputs = findArtifacts(outputDir);

  if (outputs.length === 0) {
    console.log(`Output directory: ${outputDir}`);
    return;
  }

  for (const output of outputs) {
    console.log(`Artifact: ${output}`);
  }
}

function findArtifacts(root) {
  if (!fsSync.existsSync(root)) return [];
  const results = [];
  walk(root, results);
  return results.filter((file) => /\.(app|dmg|exe)$/i.test(file));
}

function walk(dir, results) {
  for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.endsWith(".app")) {
        results.push(fullPath);
        continue;
      }
      walk(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }
}
