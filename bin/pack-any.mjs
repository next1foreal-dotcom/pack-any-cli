#!/usr/bin/env node
import {
  createDetectedPlan,
  createDetectedInitPlan,
  detectProjectType,
  helpText,
  parseArgs,
  runPlan,
  upstreamCredits,
} from "../src/core.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(helpText());
    return;
  }

  if (options.command === "credits") {
    console.log(upstreamCredits());
    return;
  }

  if (options.command === "detect") {
    console.log(await detectProjectType(options.project));
    return;
  }

  if (options.command === "init") {
    await runPlan(await createDetectedInitPlan(options));
    return;
  }

  if (options.command === "pack") {
    await runPlan(await createDetectedPlan(options));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
