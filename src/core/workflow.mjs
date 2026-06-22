import { detectProjectType } from "./detect.mjs";
import { assertDirectorySync } from "../utils/fs.mjs";
import { writeMacosWorkflow } from "../workflows/github-actions.mjs";

export async function createDetectedWorkflowPlan(options) {
  assertDirectorySync(options.project, "Project path");
  const type = options.type === "auto" ? await detectProjectType(options.project) : options.type;
  const target = options._provided?.has("target") || isMacTarget(options.target) ? options.target : "dmg";

  return {
    type: "github-actions",
    steps: [
      {
        name: "Write macOS GitHub Actions workflow",
        run: () => writeMacosWorkflow({ ...options, type, target }),
      },
    ],
  };
}

function isMacTarget(target) {
  return ["mac", "mac-x64", "mac-arm64", "mac-universal", "mac-dir", "dmg"].includes(target);
}
