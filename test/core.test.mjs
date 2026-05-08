import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createPlan,
  createDetectedInitPlan,
  detectProjectType,
  getAdapter,
  parseArgs,
  resolveOptions,
  upstreamCredits,
} from "../src/core.mjs";

async function withTempProject(files, callback) {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "pack-any-"));
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(project, name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }
  await callback(project);
}

async function testDetectsCommonProjects() {
  await withTempProject({ "package.json": "{\"dependencies\":{\"next\":\"16.0.0\"}}" }, async (project) => {
    assert.equal(await detectProjectType(project), "next-electron");
  });
  await withTempProject({
    "package.json": "{\"devDependencies\":{\"typescript\":\"latest\"}}",
    "tsconfig.json": "{}",
  }, async (project) => {
    assert.equal(await detectProjectType(project), "typescript");
  });
  await withTempProject({
    "package.json": "{\"devDependencies\":{\"typescript\":\"latest\"}}",
  }, async (project) => {
    assert.equal(await detectProjectType(project), "unknown");
  });
  await withTempProject({ "pyproject.toml": "[project]\nname='demo'\n" }, async (project) => {
    assert.equal(await detectProjectType(project), "python");
  });
  await withTempProject({ "go.mod": "module demo\n" }, async (project) => {
    assert.equal(await detectProjectType(project), "go");
  });
  await withTempProject({ "app.csproj": "<Project Sdk=\"Microsoft.NET.Sdk\" />\n" }, async (project) => {
    assert.equal(await detectProjectType(project), "dotnet");
  });
  await withTempProject({ "pom.xml": "<project />\n" }, async (project) => {
    assert.equal(await detectProjectType(project), "java");
  });
  await withTempProject({ "Cargo.toml": "[package]\nname='demo'\n" }, async (project) => {
    assert.equal(await detectProjectType(project), "rust");
  });
  await withTempProject({ "pubspec.yaml": "name: demo\n" }, async (project) => {
    assert.equal(await detectProjectType(project), "flutter");
  });
  await withTempProject({ "CMakeLists.txt": "cmake_minimum_required(VERSION 3.20)\n" }, async (project) => {
    assert.equal(await detectProjectType(project), "cpp");
  });
}

async function testMissingProjectHasActionableError() {
  const missingProject = path.join(os.tmpdir(), "pack-any-missing-project");
  await assert.rejects(
    () => detectProjectType(missingProject),
    /Project path does not exist/,
  );
  assert.throws(
    () => createPlan({
      command: "pack",
      project: missingProject,
      type: "python",
      entry: "app.py",
      target: "win-x64",
      checks: [],
      verify: false,
      init: true,
    }),
    /Project path does not exist/,
  );
}

async function testParseArgs() {
  const parsed = parseArgs(["pack", "--project", "demo", "--type", "python", "--entry", "app.py", "--target", "win-x64"]);

  assert.equal(parsed.command, "pack");
  assert.equal(parsed.type, "python");
  assert.equal(parsed.entry, "app.py");
  assert.equal(parsed.target, "win-x64");

  assert.equal(parseArgs(["pack", "--type", "ts"]).type, "typescript");
  assert.equal(parseArgs(["pack", "--type", "typescript"]).type, "typescript");
  assert.equal(parseArgs(["pack", "--type", "c"]).type, "cpp");
  assert.equal(parseArgs(["pack", "--type", "c++"]).type, "cpp");
  assert.equal(parseArgs(["pack", "--type", "csharp"]).type, "dotnet");
  assert.equal(parseArgs(["pack", "--type", "c#"]).type, "dotnet");
  assert.equal(parseArgs(["pack", "--config", "pack-any.config.mjs"]).config, path.resolve("pack-any.config.mjs"));
}

async function testConfigFileResolvesOptions() {
  await withTempProject({
    "app.py": "print('hello')\n",
    "pack-any.config.mjs": `export default {
      type: "python",
      project: ".",
      entry: "app.py",
      name: "configured-tool",
      target: "win-x64",
      checks: ["lint"],
      verify: false,
      skipInit: true
    };\n`,
  }, async (project) => {
    const options = await resolveOptions(parseArgs(["pack", "--project", project]));
    assert.equal(options.type, "python");
    assert.equal(options.project, project);
    assert.equal(options.entry, "app.py");
    assert.equal(options.name, "configured-tool");
    assert.deepEqual(options.checks, ["lint"]);
    assert.equal(options.verify, false);
    assert.equal(options.init, false);
  });

  await withTempProject({
    "custom.json": JSON.stringify({
      type: "python",
      project: ".",
      entry: "from-config.py",
      name: "from-config",
      checks: ["config-check"],
    }),
  }, async (project) => {
    const options = await resolveOptions(parseArgs([
      "pack",
      "--config",
      path.join(project, "custom.json"),
      "--entry",
      "from-cli.py",
      "--check",
      "cli-check",
      "--name",
      "from-cli",
    ]));
    assert.equal(options.project, project);
    assert.equal(options.entry, "from-cli.py");
    assert.equal(options.name, "from-cli");
    assert.deepEqual(options.checks, ["cli-check"]);
  });

  await withTempProject({
    "bom.json": `\uFEFF${JSON.stringify({ type: "python", project: ".", entry: "app.py" })}`,
  }, async (project) => {
    const options = await resolveOptions(parseArgs(["pack", "--config", path.join(project, "bom.json")]));
    assert.equal(options.type, "python");
    assert.equal(options.project, project);
    assert.equal(options.entry, "app.py");
  });

  await withTempProject({
    "pack-any.config.json": JSON.stringify({ type: "typescript", productName: "Friendly Name" }),
  }, async (project) => {
    const options = await resolveOptions(parseArgs(["pack", "--project", project]));
    assert.equal(options.productName, "Friendly Name");
    assert.equal(options.name, "Friendly Name");
  });
}

async function testPlansUseAdapters() {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "pack-any-plan-"));
  const pythonPlan = createPlan({
    command: "pack",
    project,
    type: "python",
    entry: "app.py",
    target: "win-x64",
    checks: [],
    verify: false,
    init: true,
  });
  assert.deepEqual(pythonPlan.steps.map((step) => step.name), [
    "Install Python packaging dependency",
    "Build Python executable",
    "Show output paths",
  ]);

  const goPlan = createPlan({
    command: "pack",
    project,
    type: "go",
    target: "win-x64",
    checks: [],
    verify: false,
    init: true,
  });
  assert.equal(goPlan.steps[0].command, "go");
  assert.deepEqual(goPlan.steps[0].env.GOOS, "windows");

  const typeScriptPlan = createPlan({
    command: "pack",
    project,
    type: "typescript",
    entry: "dist/index.js",
    target: "win-x64",
    checks: [],
    verify: false,
    init: true,
  });
  assert.deepEqual(typeScriptPlan.steps.map((step) => step.name), [
    "Compile TypeScript project",
    "Build TypeScript executable",
    "Show output paths",
  ]);

  const javaPlan = createPlan({
    command: "pack",
    project,
    type: "java",
    entry: "demo.jar",
    input: "target",
    target: "win-x64",
    checks: [],
    verify: false,
    init: true,
  });
  assert.deepEqual(javaPlan.steps.map((step) => step.name), [
    "Build Java project",
    "Package Java app with jpackage",
    "Show output paths",
  ]);

  const rustPlan = createPlan({
    command: "pack",
    project,
    type: "rust",
    target: "win-x64",
    checks: [],
    verify: false,
    init: true,
  });
  assert.equal(rustPlan.steps[0].command, "cargo");

  const flutterPlan = createPlan({
    command: "pack",
    project,
    type: "flutter",
    target: "win-x64",
    checks: [],
    verify: false,
    init: true,
  });
  assert.equal(flutterPlan.steps[0].command, "flutter");

  const cppPlan = createPlan({
    command: "pack",
    project,
    type: "cpp",
    target: "win-x64",
    checks: [],
    verify: false,
    init: true,
  });
  assert.equal(cppPlan.steps[0].command, "cmake");
}

async function testInitRejectsAdaptersWithoutInit() {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), "pack-any-init-"));
  await assert.rejects(
    () => createDetectedInitPlan({
      command: "init",
      project,
      type: "python",
      target: "win-x64",
      checks: [],
      verify: false,
      init: true,
    }),
    /init is only supported/,
  );
}

async function testAdapterRegistryAndCredits() {
  assert.equal(getAdapter("next-electron").type, "next-electron");
  assert.equal(getAdapter("python").type, "python");
  assert.equal(getAdapter("go").type, "go");
  assert.equal(getAdapter("dotnet").type, "dotnet");
  assert.equal(getAdapter("typescript").type, "typescript");
  assert.equal(getAdapter("java").type, "java");
  assert.equal(getAdapter("rust").type, "rust");
  assert.equal(getAdapter("flutter").type, "flutter");
  assert.equal(getAdapter("cpp").type, "cpp");
  assert.match(upstreamCredits(), /PyInstaller/);
  assert.match(upstreamCredits(), /electron-builder/);
  assert.match(upstreamCredits(), /dotnet publish/);
  assert.match(upstreamCredits(), /TypeScript/);
  assert.match(upstreamCredits(), /yao-pkg/);
  assert.match(upstreamCredits(), /jpackage/);
  assert.match(upstreamCredits(), /Cargo/);
  assert.match(upstreamCredits(), /Flutter/);
  assert.match(upstreamCredits(), /CMake/);
}

await testDetectsCommonProjects();
await testMissingProjectHasActionableError();
await testParseArgs();
await testConfigFileResolvesOptions();
await testPlansUseAdapters();
await testInitRejectsAdaptersWithoutInit();
await testAdapterRegistryAndCredits();

console.log("pack-any core tests passed");
