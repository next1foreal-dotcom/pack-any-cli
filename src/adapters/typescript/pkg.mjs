import path from "node:path";
import { existsSync, readJson } from "../../utils/fs.mjs";

export const typeScriptAdapter = {
  type: "typescript",
  label: "TypeScript / tsc / yao-pkg",
  detectFiles: ["tsconfig.json"],
  credits: [
    ["TypeScript", "https://www.typescriptlang.org/"],
    ["Node.js", "https://nodejs.org/"],
    ["yao-pkg", "https://github.com/yao-pkg/pkg"],
  ],
  async canDetect(project) {
    try {
      if (!existsSync(path.join(project, "tsconfig.json"))) return false;
      const pkg = await readJson(path.join(project, "package.json"));
      return Boolean(pkg.dependencies?.typescript || pkg.devDependencies?.typescript);
    } catch {
      return false;
    }
  },
  createPlan(options, helpers) {
    const name = options.name || helpers.projectName(options.project);
    const entry = options.entry || "dist/index.js";
    const exePath = path.join(options.project, "dist", `${name}.exe`);
    return [
      createCompileStep(options.project),
      {
        name: "Build TypeScript executable",
        command: "npx",
        args: [
          "--yes",
          "@yao-pkg/pkg",
          entry,
          "--targets",
          `node20-win-${pkgArch(options.target)}`,
          "--output",
          exePath,
        ],
        cwd: options.project,
      },
      {
        name: "Show output paths",
        run: async () => {
          console.log(`Executable: ${exePath}`);
        },
      },
    ];
  },
};

function createCompileStep(project) {
  return {
    name: "Compile TypeScript project",
    command: "npx",
    args: ["--yes", "--package", "typescript", "tsc", "-p", "tsconfig.json"],
    cwd: project,
  };
}

function pkgArch(target) {
  if (target.endsWith("arm64")) return "arm64";
  return "x64";
}
