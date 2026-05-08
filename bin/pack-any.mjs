#!/usr/bin/env node
import {
  createDetectedPlan,
  createDetectedInitPlan,
  detectProjectType,
  helpText,
  parseArgs,
  resolveOptions,
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
    const resolved = await resolveOptions(options);
    console.log(await detectProjectType(resolved.project));
    return;
  }

  if (options.command === "init") {
    await runPlan(await createDetectedInitPlan(await resolveOptions(options)));
    return;
  }

  if (options.command === "pack") {
    await runPlan(await createDetectedPlan(await resolveOptions(options)));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
