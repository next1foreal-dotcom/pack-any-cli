import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CONFIG_FILENAMES = [
  "pack-any.config.mjs",
  "pack-any.config.js",
  "pack-any.config.json",
];

export async function resolveOptions(options) {
  const configPath = await findConfigPath(options);
  if (!configPath) return options;

  const config = await loadConfig(configPath);
  const configDir = path.dirname(configPath);
  const merged = { ...options };
  const provided = options._provided || new Set();

  applyConfigValue(merged, provided, config, "type", normalizeType);
  applyConfigValue(merged, provided, config, "target");
  applyConfigValue(merged, provided, config, "entry");
  applyConfigValue(merged, provided, config, "input");
  applyConfigValue(merged, provided, config, "mainClass");
  applyConfigValue(merged, provided, config, "name");
  applyConfigValue(merged, provided, config, "productName");
  syncNameAliases(merged, provided, config);
  applyConfigValue(merged, provided, config, "verify", Boolean);

  if (!provided.has("project") && typeof config.project === "string") {
    merged.project = path.resolve(configDir, config.project);
  } else if (!provided.has("project") && options.config) {
    merged.project = configDir;
  }

  if (!provided.has("checks")) {
    const checks = config.checks ?? config.check;
    if (typeof checks === "string") merged.checks = [checks];
    else if (Array.isArray(checks)) merged.checks = checks.map(String);
  }

  if (!provided.has("init")) {
    if (typeof config.init === "boolean") merged.init = config.init;
    if (typeof config.skipInit === "boolean") merged.init = !config.skipInit;
  }

  Object.defineProperty(merged, "_provided", {
    enumerable: false,
    value: provided,
  });
  return merged;
}

async function findConfigPath(options) {
  if (options.config) {
    const resolved = path.resolve(options.config);
    await assertFile(resolved, "Config file");
    return resolved;
  }

  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(options.project, filename);
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function loadConfig(configPath) {
  if (configPath.endsWith(".json")) {
    return JSON.parse(stripBom(await fs.readFile(configPath, "utf8")));
  }

  const url = pathToFileURL(configPath);
  url.searchParams.set("t", Date.now().toString());
  const module = await import(url.href);
  const config = module.default ?? module.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`Config file must export an object: ${configPath}`);
  }
  return config;
}

function syncNameAliases(target, provided, config) {
  if (!provided.has("name") && target.name == null && typeof config.productName === "string") {
    target.name = config.productName;
  }
  if (!provided.has("productName") && target.productName == null && typeof config.name === "string") {
    target.productName = config.name;
  }
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function applyConfigValue(target, provided, config, key, transform = (value) => value) {
  if (provided.has(key) || config[key] === undefined) return;
  target[key] = transform(config[key]);
}

function normalizeType(type) {
  const aliases = {
    ts: "typescript",
    c: "cpp",
    "c++": "cpp",
    csharp: "dotnet",
    "c#": "dotnet",
  };
  return aliases[type] || type;
}

async function assertFile(file, label) {
  try {
    const stats = await fs.stat(file);
    if (!stats.isFile()) throw new Error(`${label} is not a file: ${file}`);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${label} does not exist: ${file}`);
    throw error;
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
