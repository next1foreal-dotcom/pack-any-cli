import { runCommand } from "../utils/command.mjs";

export async function runPlan(plan) {
  for (const step of plan.steps) {
    console.log(`\n> ${step.name}`);
    if (step.run) {
      await step.run();
    } else {
      await runCommand(step.command, step.args, step.cwd, step.env);
    }
  }
}
