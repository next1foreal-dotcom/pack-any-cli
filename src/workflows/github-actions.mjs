import path from "node:path";
import { fs, fsSync, readJson } from "../utils/fs.mjs";

const WORKFLOW_PATH = path.join(".github", "workflows", "build-macos.yml");

export async function writeMacosWorkflow(options) {
  if (options.type !== "vite-electron") {
    throw new Error("macOS workflow generation currently supports --type vite-electron.");
  }

  const workflowPath = path.join(options.project, WORKFLOW_PATH);
  if (fsSync.existsSync(workflowPath)) {
    throw new Error(`Workflow already exists: ${workflowPath}`);
  }

  const pkg = await readJson(path.join(options.project, "package.json"));
  const outputDir = pkg.build?.directories?.output || "release";
  const target = normalizeMacTarget(options.target);
  const yaml = renderMacosWorkflow({ outputDir, target });

  await fs.mkdir(path.dirname(workflowPath), { recursive: true });
  await fs.writeFile(workflowPath, yaml, "utf8");
  console.log(`Workflow: ${workflowPath}`);
}

export function renderMacosWorkflow({ outputDir = "release", target = "dmg" } = {}) {
  const buildCommand = electronBuilderCommand(normalizeMacTarget(target));
  return `name: Build macOS App

on:
  workflow_dispatch:

jobs:
  build-macos:
    runs-on: macos-latest
    timeout-minutes: 45

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build

      - name: Build macOS package
        run: ${buildCommand}

      - name: Check package output
        run: |
          test -d "${outputDir}"
          find "${outputDir}" -maxdepth 4 \\( -name "*.dmg" -o -name "*.zip" -o -name "*.app" \\) -print

      - name: Upload macOS artifact
        uses: actions/upload-artifact@v4
        with:
          name: macos-${target}
          path: |
            ${outputDir}/**/*.dmg
            ${outputDir}/**/*.zip
            ${outputDir}/**/*.app
          if-no-files-found: error
`;
}

function normalizeMacTarget(target) {
  if (!target || target === "mac") return "dmg";
  if (target === "mac-universal") return "dmg";
  if (target === "mac-x64" || target === "mac-arm64" || target === "mac-dir" || target === "dmg") return target;
  throw new Error(`Unsupported macOS workflow target "${target}". Use dmg, mac-x64, mac-arm64, mac-universal, or mac-dir.`);
}

function electronBuilderCommand(target) {
  if (target === "mac-x64") return "npx electron-builder --mac dmg --x64";
  if (target === "mac-arm64") return "npx electron-builder --mac dmg --arm64";
  if (target === "mac-dir") return "npx electron-builder --mac dir";
  return "npx electron-builder --mac dmg --universal";
}
