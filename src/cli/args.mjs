import path from "node:path";

export function parseArgs(argv) {
  const options = {
    command: "help",
    project: process.cwd(),
    type: "auto",
    target: "win-x64",
    entry: null,
    name: null,
    productName: null,
    input: null,
    mainClass: null,
    checks: [],
    verify: true,
    init: true,
    help: false,
  };

  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    options.help = true;
    return options;
  }
  if (command === "credits") {
    options.command = "credits";
    return options;
  }
  if (!["detect", "init", "pack"].includes(command)) {
    throw new Error(`Unknown command "${command}". Use detect, init, pack, or credits.`);
  }
  options.command = command;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const takeValue = () => {
      const value = rest[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      index += 1;
      return value;
    };

    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--project" || arg === "-p") options.project = path.resolve(takeValue());
    else if (arg.startsWith("--project=")) options.project = path.resolve(arg.slice("--project=".length));
    else if (arg === "--type") options.type = normalizeType(takeValue());
    else if (arg.startsWith("--type=")) options.type = normalizeType(arg.slice("--type=".length));
    else if (arg === "--target") options.target = takeValue();
    else if (arg.startsWith("--target=")) options.target = arg.slice("--target=".length);
    else if (arg === "--entry") options.entry = takeValue();
    else if (arg.startsWith("--entry=")) options.entry = arg.slice("--entry=".length);
    else if (arg === "--input") options.input = takeValue();
    else if (arg.startsWith("--input=")) options.input = arg.slice("--input=".length);
    else if (arg === "--main-class") options.mainClass = takeValue();
    else if (arg.startsWith("--main-class=")) options.mainClass = arg.slice("--main-class=".length);
    else if (arg === "--name" || arg === "--product-name") {
      const value = takeValue();
      options.name = value;
      options.productName = value;
    } else if (arg.startsWith("--name=")) options.name = arg.slice("--name=".length);
    else if (arg.startsWith("--product-name=")) {
      const value = arg.slice("--product-name=".length);
      options.name = value;
      options.productName = value;
    } else if (arg === "--check") options.checks.push(takeValue());
    else if (arg.startsWith("--check=")) options.checks.push(arg.slice("--check=".length));
    else if (arg === "--skip-init") options.init = false;
    else if (arg === "--no-verify") options.verify = false;
    else if (arg === "--verify") options.verify = true;
    else throw new Error(`Unknown argument "${arg}".`);
  }

  return options;
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
