import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createPlan,
  createDetectedInitPlan,
  createDetectedWorkflowPlan,
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
    "package.json": "{\"devDependencies\":{\"vite\":\"latest\",\"typescript\":\"latest\"}}",
    "index.html": "<div id=\"root\"></div>",
    "tsconfig.json": "{}",
  }, async (project) => {
    assert.equal(await detectProjectType(project), "vite-electron");
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
  assert.equal(parseArgs(["workflow", "--type", "vite-electron"]).command, "workflow");
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

  const vitePlan = createPlan({
    command: "pack",
    project,
    type: "vite-electron",
    target: "win-x64",
    checks: ["test"],
    verify: false,
    init: true,
  });
  assert.deepEqual(vitePlan.steps.map((step) => step.name), [
    "Initialize Vite Electron packaging",
    "Build Vite app",
    "Run test",
    "Build Windows installer",
    "Show output paths",
  ]);
  assert.deepEqual(vitePlan.steps[3].args, ["exec", "electron-builder", "--win", "nsis", "--x64"]);

  const macVitePlan = createPlan({
    command: "pack",
    project,
    type: "vite-electron",
    target: "mac-arm64",
    checks: [],
    verify: true,
    init: false,
  });
  assert.deepEqual(macVitePlan.steps.map((step) => step.name), [
    "Check macOS packaging host",
    "Build Vite app",
    "Build macOS DMG",
    "Verify packaged Vite Electron app",
    "Show output paths",
  ]);
  assert.deepEqual(macVitePlan.steps[2].args, ["exec", "electron-builder", "--mac", "dmg", "--arm64"]);

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

async function testViteInitPatchesPackageJson() {
  await withTempProject({
    "package.json": JSON.stringify({
      name: "vite-demo",
      version: "1.2.3",
      scripts: { build: "vite build" },
      devDependencies: { vite: "latest" },
    }),
    "index.html": "<div id=\"root\"></div>",
    "server/index.mjs": "export {};\n",
  }, async (project) => {
    const plan = createDetectedInitPlan({
      command: "init",
      project,
      type: "vite-electron",
      target: "win-x64",
      checks: [],
      verify: false,
      init: true,
    });
    const resolvedPlan = await plan;
    assert.deepEqual(resolvedPlan.steps.map((step) => step.name), ["Initialize Vite Electron packaging"]);
    await resolvedPlan.steps[0].run();

    const pkg = JSON.parse(await fs.readFile(path.join(project, "package.json"), "utf8"));
    assert.equal(pkg.main, "electron/main.cjs");
    assert.equal(pkg.build.productName, "Vite Demo");
    assert.equal(pkg.build.directories.output, "release");
    assert.equal(pkg.packAny.electron.serverEntry, "server/index.mjs");
    assert.equal(pkg.packAny.electron.serverPort, 3001);
    assert.equal(pkg.devDependencies.electron, "^31.0.0");
    assert.equal(pkg.devDependencies["electron-builder"], "^24.13.3");
  });
}

async function testWorkflowWritesMacosBuildFile() {
  await withTempProject({
    "package.json": JSON.stringify({
      name: "vite-demo",
      version: "1.2.3",
      devDependencies: { vite: "latest" },
      build: { directories: { output: "release" } },
    }),
    "index.html": "<div id=\"root\"></div>",
  }, async (project) => {
    const plan = await createDetectedWorkflowPlan(parseArgs([
      "workflow",
      "--project",
      project,
      "--type",
      "vite-electron",
      "--target",
      "mac-arm64",
    ]));

    assert.deepEqual(plan.steps.map((step) => step.name), ["Write macOS GitHub Actions workflow"]);
    await plan.steps[0].run();

    const workflowPath = path.join(project, ".github", "workflows", "build-macos.yml");
    const workflow = await fs.readFile(workflowPath, "utf8");
    assert.match(workflow, /workflow_dispatch/);
    assert.match(workflow, /runs-on: macos-latest/);
    assert.match(workflow, /npx electron-builder --mac dmg --arm64/);
    assert.match(workflow, /name: macos-mac-arm64/);

    await assert.rejects(() => plan.steps[0].run(), /Workflow already exists/);
  });
}

async function testWorkflowDefaultsToDmgTarget() {
  await withTempProject({
    "package.json": JSON.stringify({
      name: "vite-demo",
      devDependencies: { vite: "latest" },
    }),
    "index.html": "<div id=\"root\"></div>",
  }, async (project) => {
    const plan = await createDetectedWorkflowPlan(parseArgs([
      "workflow",
      "--project",
      project,
      "--type",
      "vite-electron",
    ]));
    await plan.steps[0].run();

    const workflow = await fs.readFile(path.join(project, ".github", "workflows", "build-macos.yml"), "utf8");
    assert.match(workflow, /npx electron-builder --mac dmg --universal/);
    assert.match(workflow, /name: macos-dmg/);
  });
}

async function testNextElectronPrepareCopiesStandaloneDependencies() {
  const templatePath = path.resolve("src", "adapters", "next-electron", "templates", "prepare-electron-next.mjs");
  const template = await fs.readFile(templatePath, "utf8");

  await withTempProject({
    "scripts/prepare-electron-next.mjs": template,
    ".next/standalone/server.js": "console.log('server');\n",
    ".next/standalone/node_modules/demo-package/index.js": "module.exports = 'demo';\n",
    ".next/static/chunk.js": "console.log('static');\n",
    "public/logo.txt": "logo\n",
  }, async (project) => {
    const scriptUrl = pathToFileURL(path.join(project, "scripts", "prepare-electron-next.mjs"));
    scriptUrl.searchParams.set("t", Date.now().toString());
    await import(scriptUrl.href);

    const copiedDependency = path.join(project, ".electron-next", "node_modules", "demo-package", "index.js");
    const copiedStatic = path.join(project, ".electron-next", ".next", "static", "chunk.js");
    const copiedPublic = path.join(project, ".electron-next", "public", "logo.txt");
    assert.equal(await fileExists(copiedDependency), true);
    assert.equal(await fileExists(copiedStatic), true);
    assert.equal(await fileExists(copiedPublic), true);
  });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function testAdapterRegistryAndCredits() {
  assert.equal(getAdapter("next-electron").type, "next-electron");
  assert.equal(getAdapter("vite-electron").type, "vite-electron");
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
  assert.match(upstreamCredits(), /Vite/);
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
await testViteInitPatchesPackageJson();
await testWorkflowWritesMacosBuildFile();
await testWorkflowDefaultsToDmgTarget();
await testNextElectronPrepareCopiesStandaloneDependencies();
await testAdapterRegistryAndCredits();

console.log("pack-any core tests passed");
