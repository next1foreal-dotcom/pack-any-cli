import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileEnsuringDir, fs, fsSync, readJson, writeJson } from "../../utils/fs.mjs";
import { slugify, titleCase } from "../../utils/naming.mjs";

const adapterDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(adapterDir, "templates");

export async function initViteElectron(options) {
  const project = options.project;
  await copyTemplate("electron-main.cjs", path.join(project, "electron", "main.cjs"));
  await copyTemplate("electron-preload.cjs", path.join(project, "electron", "preload.cjs"));
  await patchPackageJson(project, options.name || options.productName);
  await patchGitignore(project);
}

async function copyTemplate(name, target) {
  await copyFileEnsuringDir(path.join(templateDir, name), target);
}

async function patchPackageJson(project, productNameOverride) {
  const packageJsonPath = path.join(project, "package.json");
  const pkg = await readJson(packageJsonPath);
  const productName = productNameOverride || pkg.build?.productName || titleCase(pkg.name || "Vite App");
  const files = ["electron/**/*", "dist/**/*", "package.json"];

  if (fsSync.existsSync(path.join(project, "server"))) files.push("server/**/*");

  pkg.main = "electron/main.cjs";
  pkg.scripts = {
    ...pkg.scripts,
    "electron:dev": "electron electron/main.cjs --dev",
    "desktop:build": "vite build",
    "desktop:dir": "vite build && electron-builder --dir",
    "desktop:win": "vite build && electron-builder --win nsis --x64",
    "desktop:mac": "vite build && electron-builder --mac dmg --universal",
  };
  pkg.devDependencies = {
    ...(pkg.devDependencies || {}),
  };
  ensureDevDependency(pkg, "electron", "^31.0.0");
  ensureDevDependency(pkg, "electron-builder", "^24.13.3");
  pkg.packAny = {
    ...(pkg.packAny || {}),
    electron: buildPackAnyElectronConfig(project, pkg.packAny?.electron),
  };
  pkg.build = {
    ...(pkg.build || {}),
    appId: pkg.build?.appId || `com.local.${slugify(productName)}`,
    productName,
    artifactName: pkg.build?.artifactName || "${productName}-${version}-${os}-${arch}.${ext}",
    directories: { ...(pkg.build?.directories || {}), output: pkg.build?.directories?.output || "release" },
    files: pkg.build?.files || files,
    asar: pkg.build?.asar ?? true,
    win: pkg.build?.win || { target: [{ target: "nsis", arch: ["x64"] }] },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: productName,
      ...(pkg.build?.nsis || {}),
    },
    mac: {
      category: "public.app-category.productivity",
      target: [{ target: "dmg", arch: ["x64", "arm64"] }],
      ...(pkg.build?.mac || {}),
    },
    dmg: {
      ...(pkg.build?.dmg || {}),
    },
  };

  await writeJson(packageJsonPath, pkg);
}

function ensureDevDependency(pkg, name, version) {
  if (pkg.dependencies?.[name] || pkg.devDependencies?.[name]) return;
  pkg.devDependencies[name] = version;
}

function buildPackAnyElectronConfig(project, existing = {}) {
  const config = {
    staticDir: "dist",
    ...existing,
  };

  if (config.serverEntry === undefined && fsSync.existsSync(path.join(project, "server", "index.mjs"))) {
    config.serverEntry = "server/index.mjs";
    config.serverPort = config.serverPort || 3001;
    config.serverHealthPath = config.serverHealthPath || "/health";
  }

  return config;
}

async function patchGitignore(project) {
  const filePath = path.join(project, ".gitignore");
  let source = "";
  try {
    source = await fs.readFile(filePath, "utf8");
  } catch {
    // Create below.
  }
  if (!source.includes("/release/")) {
    await fs.writeFile(filePath, `${source.trimEnd()}\n/release/\n`, "utf8");
  }
}
