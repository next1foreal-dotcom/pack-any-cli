import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileEnsuringDir, fs, fsSync, readJson, writeJson } from "../../utils/fs.mjs";
import { slugify, titleCase } from "../../utils/naming.mjs";

const adapterDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(adapterDir, "templates");

export async function initNextElectron(options) {
  const project = options.project;
  await copyTemplate("electron-main.cjs", path.join(project, "electron", "main.cjs"));
  await copyTemplate("electron-preload.cjs", path.join(project, "electron", "preload.cjs"));
  await copyTemplate("prepare-electron-next.mjs", path.join(project, "scripts", "prepare-electron-next.mjs"));
  await patchPackageJson(project, options.name || options.productName);
  await patchNextConfig(project);
  await patchGitignore(project);
}

async function copyTemplate(name, target) {
  await copyFileEnsuringDir(path.join(templateDir, name), target);
}

async function patchPackageJson(project, productNameOverride) {
  const packageJsonPath = path.join(project, "package.json");
  const pkg = await readJson(packageJsonPath);
  const productName = productNameOverride || pkg.build?.productName || titleCase(pkg.name || "Next App");

  pkg.main = "electron/main.cjs";
  pkg.scripts = {
    ...pkg.scripts,
    "desktop:build": "next build && node scripts/prepare-electron-next.mjs",
    "desktop:dir": "next build && node scripts/prepare-electron-next.mjs && electron-builder --win dir",
    "desktop:installer": "next build && node scripts/prepare-electron-next.mjs && electron-builder --win nsis",
    "electron:dev": "electron electron/main.cjs --dev",
  };
  pkg.build = {
    ...(pkg.build || {}),
    appId: pkg.build?.appId || `com.local.${slugify(productName)}`,
    productName,
    artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
    directories: { ...(pkg.build?.directories || {}), output: "dist" },
    files: ["electron/**/*", "package.json"],
    extraResources: [{ from: ".electron-next", to: "app-next", filter: ["**/*"] }],
    asar: true,
    win: { target: [{ target: "nsis", arch: ["x64"] }] },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: productName,
    },
  };

  await writeJson(packageJsonPath, pkg);
}

async function patchNextConfig(project) {
  const names = ["next.config.ts", "next.config.mjs", "next.config.js"];
  const existing = names.find((name) => fsSync.existsSync(path.join(project, name)));
  if (!existing) {
    await fs.writeFile(
      path.join(project, "next.config.ts"),
      'import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {\n  output: "standalone",\n};\n\nexport default nextConfig;\n',
      "utf8",
    );
    return;
  }

  const filePath = path.join(project, existing);
  const source = await fs.readFile(filePath, "utf8");
  if (/output\s*:\s*["']standalone["']/.test(source)) return;

  const match = source.match(/const\s+nextConfig(?:\s*:\s*[^=]+)?\s*=\s*\{/);
  if (!match) throw new Error(`Cannot patch ${existing}; set output: "standalone" manually.`);
  const insertAt = match.index + match[0].length;
  await fs.writeFile(filePath, `${source.slice(0, insertAt)}\n  output: "standalone",${source.slice(insertAt)}`, "utf8");
}

async function patchGitignore(project) {
  const filePath = path.join(project, ".gitignore");
  let source = "";
  try {
    source = await fs.readFile(filePath, "utf8");
  } catch {
    // Create below.
  }
  if (!source.includes("/.electron-next/")) {
    await fs.writeFile(filePath, `${source.trimEnd()}\n/.electron-next/\n`, "utf8");
  }
}
