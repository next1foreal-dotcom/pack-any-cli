import { spawn } from "node:child_process";
import path from "node:path";
import { fs, readJson } from "../utils/fs.mjs";
import { runCommand } from "../utils/command.mjs";

export async function verifyNextElectron(project) {
  if (process.platform !== "win32") {
    console.log("Skipped launch verification: Windows only.");
    return;
  }
  const pkg = await readJson(path.join(project, "package.json"));
  const productName = pkg.build?.productName || pkg.name;
  const exePath = path.join(project, "dist", "win-unpacked", `${productName}.exe`);
  const logPath = path.join(process.env.APPDATA || "", pkg.name, "startup.log");

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

  if (!log.includes("Standalone server ready") || !log.includes("Main window loaded")) {
    throw new Error(`Packaged app did not finish startup verification. Log: ${logPath}`);
  }
}
