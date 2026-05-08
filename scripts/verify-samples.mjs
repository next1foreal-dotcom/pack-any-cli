import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "pack-any.mjs");

const samples = [
  {
    name: "python",
    requiredCommands: ["python"],
    command: process.execPath,
    args: [cli, "pack", "--project", path.join(root, "samples", "python-hello"), "--type", "python", "--entry", "app.py", "--name", "python-hello", "--no-verify"],
    artifact: path.join(root, "samples", "python-hello", "dist", "python-hello.exe"),
    expectedOutput: "hello from python",
  },
  {
    name: "typescript",
    requiredCommands: ["npx"],
    command: process.execPath,
    args: [cli, "pack", "--project", path.join(root, "samples", "typescript-hello"), "--type", "typescript", "--entry", "dist/index.js", "--name", "typescript-hello", "--no-verify"],
    artifact: path.join(root, "samples", "typescript-hello", "dist", "typescript-hello.exe"),
    expectedOutput: "hello from typescript",
  },
  {
    name: "dotnet",
    requiredCommands: ["dotnet"],
    command: process.execPath,
    args: [cli, "pack", "--project", path.join(root, "samples", "dotnet-hello"), "--type", "dotnet", "--entry", "dotnet-hello.csproj", "--no-verify"],
    artifact: path.join(root, "samples", "dotnet-hello", "dist", "win-x64", "dotnet-hello.exe"),
    expectedOutput: "hello from dotnet",
  },
  {
    name: "go",
    requiredCommands: ["go"],
    command: process.execPath,
    args: [cli, "pack", "--project", path.join(root, "samples", "go-hello"), "--type", "go", "--name", "go-hello", "--no-verify"],
    artifact: path.join(root, "samples", "go-hello", "dist", "go-hello.exe"),
    expectedOutput: "hello from go",
  },
  {
    name: "rust",
    requiredCommands: ["cargo"],
    command: process.execPath,
    args: [cli, "pack", "--project", path.join(root, "samples", "rust-hello"), "--type", "rust", "--name", "rust-hello", "--no-verify"],
    artifact: path.join(root, "samples", "rust-hello", "target", "release", "rust-hello.exe"),
    expectedOutput: "hello from rust",
  },
  {
    name: "cpp",
    requiredCommands: ["cmake"],
    command: process.execPath,
    args: [cli, "pack", "--project", path.join(root, "samples", "cpp-hello"), "--type", "cpp", "--no-verify"],
    artifactCandidates: [
      path.join(root, "samples", "cpp-hello", "build", "Release", "cpp-hello.exe"),
      path.join(root, "samples", "cpp-hello", "build", "cpp-hello.exe"),
    ],
    expectedOutput: "hello from cpp",
  },
  {
    name: "java",
    requiredCommands: ["java", "jpackage", "mvn"],
    command: process.execPath,
    args: [
      cli,
      "pack",
      "--project",
      path.join(root, "samples", "java-hello"),
      "--type",
      "java",
      "--name",
      "java-hello",
      "--entry",
      "java-hello-0.1.0.jar",
      "--main-class",
      "com.example.Main",
      "--no-verify",
    ],
    artifactDir: path.join(root, "samples", "java-hello", "dist"),
    expectedArtifactExtension: ".exe",
  },
];

const results = [];

for (const sample of samples) {
  const startedAt = Date.now();
  try {
    const missingCommands = await missingRequiredCommands(sample.requiredCommands || []);
    if (missingCommands.length > 0) {
      results.push({
        name: sample.name,
        status: "skipped",
        reason: `Missing commands in PATH: ${missingCommands.join(", ")}`,
        ms: Date.now() - startedAt,
      });
      continue;
    }

    await run(sample.command, sample.args);

    if (sample.artifactDir) {
      const artifact = await firstFileWithExtension(sample.artifactDir, sample.expectedArtifactExtension);
      results.push({ name: sample.name, status: "passed", artifact, ms: Date.now() - startedAt });
      continue;
    }

    const artifact = await findArtifact(sample);
    const output = await capture(artifact, [], path.dirname(artifact));
    if (!output.includes(sample.expectedOutput)) {
      throw new Error(`Artifact output did not include "${sample.expectedOutput}". Output: ${output}`);
    }
    results.push({ name: sample.name, status: "passed", artifact, output: output.trim(), ms: Date.now() - startedAt });
  } catch (error) {
    results.push({ name: sample.name, status: "failed", error: error instanceof Error ? error.message : String(error), ms: Date.now() - startedAt });
  }
}

function capture(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} timed out`));
    }, 15000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(`${stdout}${stderr}`);
      else reject(new Error(`${command} exited with ${code}. ${stderr}`));
    });
  });
}

console.log(JSON.stringify(results, null, 2));

if (results.some((result) => result.status === "failed")) {
  process.exitCode = 1;
}

async function missingRequiredCommands(commands) {
  const missing = [];
  for (const command of commands) {
    if (!(await commandExists(command))) missing.push(command);
  }
  return missing;
}

function commandExists(command) {
  const lookupCommand = process.platform === "win32" ? "where.exe" : "command";
  const args = process.platform === "win32" ? [command] : ["-v", command];
  return new Promise((resolve) => {
    const child = spawn(lookupCommand, args, { stdio: "ignore", shell: process.platform !== "win32" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function findArtifact(sample) {
  const candidates = sample.artifactCandidates || [sample.artifact];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue checking known output locations.
    }
  }
  throw new Error(`No artifact found. Checked: ${candidates.join(", ")}`);
}

async function firstFileWithExtension(dir, extension) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const match = entries.find((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(extension));
  if (!match) throw new Error(`No ${extension} artifact found in ${dir}`);
  return path.join(dir, match.name);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32" && command !== process.execPath,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}
