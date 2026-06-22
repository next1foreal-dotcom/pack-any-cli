import fsSync from "node:fs";
import path from "node:path";
import { readJson } from "../../utils/fs.mjs";

export const viteElectronAdapter = {
  type: "vite-electron",
  label: "Vite / Electron / electron-builder",
  credits: [
    ["Vite", "https://vitejs.dev/"],
    ["Electron", "https://www.electronjs.org/"],
    ["electron-builder", "https://www.electron.build/"],
  ],
  async canDetect(project) {
    try {
      const pkg = await readJson(path.join(project, "package.json"));
      if (pkg.dependencies?.next || pkg.devDependencies?.next) return false;
      const hasVite = Boolean(pkg.dependencies?.vite || pkg.devDependencies?.vite);
      return hasVite && fsSync.existsSync(path.join(project, "index.html"));
    } catch {
      return false;
    }
  },
  createPlan(options, helpers) {
    const steps = [];

    if (options.init) {
      steps.push({
        name: "Initialize Vite Electron packaging",
        run: () => helpers.initViteElectron(options),
      });
    }

    if (isMacTarget(options.target)) {
      steps.push({
        name: "Check macOS packaging host",
        run: () => assertMacHost(options.target),
      });
    }

    steps.push({
      name: "Build Vite app",
      command: helpers.packageManager(options.project),
      args: buildArgs(options.project),
      cwd: options.project,
    });

    for (const check of options.checks) {
      steps.push({
        name: `Run ${check}`,
        command: helpers.packageManager(options.project),
        args: ["run", check],
        cwd: options.project,
      });
    }

    steps.push({
      name: buildStepName(options.target),
      command: helpers.packageManager(options.project),
      args: ["exec", "electron-builder", ...electronBuilderArgs(options.target)],
      cwd: options.project,
    });

    if (options.verify) {
      steps.push({
        name: "Verify packaged Vite Electron app",
        run: () => helpers.verifyViteElectron(options.project, options.target),
      });
    }

    steps.push({
      name: "Show output paths",
      run: () => helpers.printViteElectronOutputs(options.project, options.target),
    });

    return steps;
  },
};

function buildArgs(project) {
  const pkg = readPackageJsonSync(project);
  if (pkg.scripts?.build) return ["run", "build"];
  return ["exec", "vite", "build"];
}

function readPackageJsonSync(project) {
  try {
    return JSON.parse(fsSync.readFileSync(path.join(project, "package.json"), "utf8"));
  } catch {
    return {};
  }
}

function isMacTarget(target) {
  return ["mac", "mac-x64", "mac-arm64", "mac-universal", "mac-dir", "dmg"].includes(target);
}

function assertMacHost(target) {
  if (process.platform !== "darwin") {
    throw new Error(`${target} requires a macOS build host. Use a Mac or a GitHub Actions macOS runner.`);
  }
}

function buildStepName(target) {
  if (target === "dir") return "Build unpacked Electron app";
  if (target === "mac-dir") return "Build unpacked macOS app";
  if (isMacTarget(target)) return "Build macOS DMG";
  return "Build Windows installer";
}

function electronBuilderArgs(target) {
  if (target === "dir") return ["--dir"];
  if (target === "win-x64") return ["--win", "nsis", "--x64"];
  if (target === "win-arm64") return ["--win", "nsis", "--arm64"];
  if (target === "win-x86" || target === "win-ia32") return ["--win", "nsis", "--ia32"];
  if (target === "mac-dir") return ["--mac", "dir"];
  if (target === "mac-x64") return ["--mac", "dmg", "--x64"];
  if (target === "mac-arm64") return ["--mac", "dmg", "--arm64"];
  if (target === "mac" || target === "mac-universal" || target === "dmg") return ["--mac", "dmg", "--universal"];
  throw new Error(`Unsupported vite-electron target "${target}". Use win-x64, win-arm64, mac-x64, mac-arm64, mac-universal, dmg, dir, or mac-dir.`);
}
