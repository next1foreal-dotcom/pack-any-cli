import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const expectedFiles = [
  "bin/pack-any.mjs",
  "src/cli/args.mjs",
  "src/cli/help.mjs",
  "src/core/detect.mjs",
  "src/core/config.mjs",
  "src/core/plan.mjs",
  "src/core/runner.mjs",
  "src/core/workflow.mjs",
  "src/adapters/index.mjs",
  "src/adapters/next-electron/adapter.mjs",
  "src/adapters/next-electron/init.mjs",
  "src/adapters/next-electron/outputs.mjs",
  "src/adapters/vite-electron/adapter.mjs",
  "src/adapters/vite-electron/init.mjs",
  "src/adapters/vite-electron/outputs.mjs",
  "src/adapters/python/pyinstaller.mjs",
  "src/adapters/typescript/pkg.mjs",
  "src/adapters/go/adapter.mjs",
  "src/adapters/dotnet/adapter.mjs",
  "src/adapters/java/jpackage.mjs",
  "src/adapters/rust/cargo.mjs",
  "src/adapters/flutter/adapter.mjs",
  "src/adapters/cpp/cmake.mjs",
  "src/verify/next-electron-launch.mjs",
  "src/verify/vite-electron-launch.mjs",
  "src/workflows/github-actions.mjs",
  "src/utils/naming.mjs",
  "src/utils/package-manager.mjs",
  "src/utils/target.mjs",
  "src/utils/command.mjs",
  "src/utils/fs.mjs",
  "src/adapters/next-electron/templates/electron-main.cjs",
  "src/adapters/next-electron/templates/electron-preload.cjs",
  "src/adapters/next-electron/templates/prepare-electron-next.mjs",
  "src/adapters/vite-electron/templates/electron-main.cjs",
  "src/adapters/vite-electron/templates/electron-preload.cjs",
  "src/core.mjs",
  "README.md",
  "README.zh-CN.md",
  "CHANGELOG.md",
  "ACKNOWLEDGEMENTS.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "docs/QUALITY.md",
  ".gitattributes",
  ".github/workflows/ci.yml",
];

const forbiddenFiles = [
  "src/adapters/next-electron.mjs",
  "src/adapters/vite-electron.mjs",
  "src/adapters/python-pyinstaller.mjs",
  "src/adapters/go.mjs",
  "src/adapters/dotnet.mjs",
  "src/templates/next-electron/electron-main.cjs",
];

for (const file of expectedFiles) {
  assert.equal(fs.existsSync(path.join(root, file)), true, `Missing expected project file: ${file}`);
}

for (const file of forbiddenFiles) {
  assert.equal(fs.existsSync(path.join(root, file)), false, `Old flat file should be removed: ${file}`);
}

console.log("pack-any structure tests passed");
