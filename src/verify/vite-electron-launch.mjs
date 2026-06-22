import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fs, fsSync, readJson } from "../utils/fs.mjs";
import { runCommand } from "../utils/command.mjs";

export async function verifyViteElectron(project, target) {
  if (target.startsWith("mac") || target === "dmg") {
    await verifyMac(project);
    return;
  }

  if (process.platform !== "win32") {
    console.log("Skipped launch verification: Windows targets require Windows.");
    return;
  }

  await verifyWindows(project);
}

async function verifyWindows(project) {
  const { pkg, productName, outputDir } = await readProjectBuild(project);
  const exePath = path.join(outputDir, "win-unpacked", `${productName}.exe`);
  const logPath = path.join(process.env.APPDATA || "", productName, "startup.log");

  await fs.access(exePath);
  await fs.rm(logPath, { force: true });

  const child = spawn(exePath, [], { cwd: path.dirname(exePath), detached: true, stdio: "ignore" });
  child.unref();
  await new Promise((resolve) => setTimeout(resolve, 12000));

  let log = "";
  try {
    log = await fs.readFile(logPath, "utf8");
  } catch {
    // Report below.
  }
  try {
    await runCommand("taskkill", ["/PID", String(child.pid), "/T", "/F"], project);
  } catch {
    // Already closed.
  }

  if (!log.includes("Main window loaded")) {
    throw new Error(`Packaged app did not finish startup verification. Log: ${logPath}. Package: ${pkg.name}`);
  }
}

async function verifyMac(project) {
  if (process.platform !== "darwin") {
    console.log("Skipped launch verification: macOS targets require macOS.");
    return;
  }

  const { productName, outputDir } = await readProjectBuild(project);
  const appPath = findFirstApp(outputDir);
  const logPath = path.join(os.homedir(), "Library", "Application Support", productName, "startup.log");

  if (!appPath) throw new Error(`Could not find a .app in ${outputDir}`);
  await fs.rm(logPath, { force: true });

  await runCommand("open", ["-n", appPath], project);
  await new Promise((resolve) => setTimeout(resolve, 12000));

  let log = "";
  try {
    log = await fs.readFile(logPath, "utf8");
  } catch {
    // Report below.
  }
  try {
    await runCommand("osascript", ["-e", `quit app "${productName}"`], project);
  } catch {
    // Already closed.
  }

  if (!log.includes("Main window loaded")) {
    throw new Error(`Packaged app did not finish startup verification. Log: ${logPath}`);
  }
}

async function readProjectBuild(project) {
  const pkg = await readJson(path.join(project, "package.json"));
  const productName = pkg.build?.productName || pkg.name;
  const outputDir = path.join(project, pkg.build?.directories?.output || "release");
  return { pkg, productName, outputDir };
}

function findFirstApp(root) {
  if (!fsSync.existsSync(root)) return null;
  const stack = [root];

  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name.endsWith(".app")) return fullPath;
      if (entry.isDirectory()) stack.push(fullPath);
    }
  }

  return null;
}
