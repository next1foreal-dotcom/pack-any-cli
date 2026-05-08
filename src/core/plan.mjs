import { getAdapter } from "../adapters/index.mjs";
import { initNextElectron } from "../adapters/next-electron/init.mjs";
import { printNextElectronOutputs } from "../adapters/next-electron/outputs.mjs";
import { packageManager } from "../utils/package-manager.mjs";
import { assertDirectorySync } from "../utils/fs.mjs";
import { projectName } from "../utils/naming.mjs";
import { targetArch, targetRuntime } from "../utils/target.mjs";
import { verifyNextElectron } from "../verify/next-electron-launch.mjs";
import { detectProjectType } from "./detect.mjs";

const helpers = {
  packageManager,
  projectName,
  targetArch,
  targetRuntime,
  initNextElectron,
  verifyNextElectron,
  printNextElectronOutputs,
};

export function createPlan(options) {
  assertDirectorySync(options.project, "Project path");
  const adapter = getAdapter(options.type);
  return {
    type: adapter.type,
    steps: adapter.createPlan(options, helpers),
  };
}

export async function createDetectedPlan(options) {
  const type = options.type === "auto" ? await detectProjectType(options.project) : options.type;
  if (type === "unknown") {
    throw new Error("Could not detect project type. Pass --type next-electron|typescript|python|go|dotnet|java|rust|flutter|cpp.");
  }
  return createPlan({ ...options, type });
}

export async function createDetectedInitPlan(options) {
  const plan = await createDetectedPlan({ ...options, init: true, verify: false, checks: [] });
  const steps = plan.steps.filter((step) => step.name.startsWith("Initialize "));
  if (steps.length === 0) {
    throw new Error("init is only supported by adapters that write project scaffolding. Currently supported: next-electron.");
  }
  return { ...plan, steps };
}
