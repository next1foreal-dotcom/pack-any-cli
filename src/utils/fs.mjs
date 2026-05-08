import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

export function existsSync(filePath) {
  return fsSync.existsSync(filePath);
}

export function assertDirectorySync(filePath, label = "Path") {
  let stat;
  try {
    stat = fsSync.statSync(filePath);
  } catch {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`${label} is not a directory: ${filePath}`);
  }
}

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function copyFileEnsuringDir(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

export { fs, fsSync };
