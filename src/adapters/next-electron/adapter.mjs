import fs from "node:fs/promises";
import path from "node:path";

export const nextElectronAdapter = {
  type: "next-electron",
  label: "Next.js / Electron / electron-builder",
  credits: [
    ["Electron", "https://www.electronjs.org/"],
    ["electron-builder", "https://www.electron.build/"],
    ["Next.js", "https://nextjs.org/"],
    ["NSIS", "https://nsis.sourceforge.io/"],
  ],
  async canDetect(project) {
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(project, "package.json"), "utf8"));
      return Boolean(pkg.dependencies?.next || pkg.devDependencies?.next);
    } catch {
      return false;
    }
  },
  createPlan(options, helpers) {
    const steps = [];

    if (options.init) {
      steps.push({
        name: "Initialize Next Electron packaging",
        run: () => helpers.initNextElectron(options),
      });
    }

    steps.push(
      {
        name: "Clean desktop staging",
        run: () => fs.rm(path.join(options.project, ".electron-next"), { recursive: true, force: true }),
      },
      {
        name: "Build Next standalone",
        command: helpers.packageManager(options.project),
        args: ["exec", "next", "build"],
        cwd: options.project,
      },
      {
        name: "Prepare Electron assets",
        command: process.execPath,
        args: [path.join("scripts", "prepare-electron-next.mjs")],
        cwd: options.project,
      },
    );

    for (const check of options.checks) {
      steps.push({
        name: `Run ${check}`,
        command: helpers.packageManager(options.project),
        args: ["run", check],
        cwd: options.project,
      });
    }

    steps.push({
      name: options.target === "dir" ? "Build unpacked Windows app" : "Build Windows installer",
      command: helpers.packageManager(options.project),
      args: ["exec", "electron-builder", "--win", options.target === "dir" ? "dir" : "nsis"],
      cwd: options.project,
    });

    if (options.verify) {
      steps.push({
        name: "Verify packaged app",
        run: () => helpers.verifyNextElectron(options.project),
      });
    }

    steps.push({
      name: "Show output paths",
      run: () => helpers.printNextElectronOutputs(options.project, options.target),
    });

    return steps;
  },
};
