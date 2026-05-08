import path from "node:path";

export function parseArgs(argv) {
  const provided = new Set();
  const options = {
    command: "help",
    project: process.cwd(),
    config: null,
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
    else if (arg === "--project" || arg === "-p") {
      options.project = path.resolve(takeValue());
      provided.add("project");
    } else if (arg.startsWith("--project=")) {
      options.project = path.resolve(arg.slice("--project=".length));
      provided.add("project");
    } else if (arg === "--config") {
      options.config = path.resolve(takeValue());
      provided.add("config");
    } else if (arg.startsWith("--config=")) {
      options.config = path.resolve(arg.slice("--config=".length));
      provided.add("config");
    } else if (arg === "--type") {
      options.type = normalizeType(takeValue());
      provided.add("type");
    } else if (arg.startsWith("--type=")) {
      options.type = normalizeType(arg.slice("--type=".length));
      provided.add("type");
    } else if (arg === "--target") {
      options.target = takeValue();
      provided.add("target");
    } else if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
      provided.add("target");
    } else if (arg === "--entry") {
      options.entry = takeValue();
      provided.add("entry");
    } else if (arg.startsWith("--entry=")) {
      options.entry = arg.slice("--entry=".length);
      provided.add("entry");
    } else if (arg === "--input") {
      options.input = takeValue();
      provided.add("input");
    } else if (arg.startsWith("--input=")) {
      options.input = arg.slice("--input=".length);
      provided.add("input");
    } else if (arg === "--main-class") {
      options.mainClass = takeValue();
      provided.add("mainClass");
    } else if (arg.startsWith("--main-class=")) {
      options.mainClass = arg.slice("--main-class=".length);
      provided.add("mainClass");
    }
    else if (arg === "--name" || arg === "--product-name") {
      const value = takeValue();
      options.name = value;
      options.productName = value;
      provided.add("name");
      provided.add("productName");
    } else if (arg.startsWith("--name=")) {
      options.name = arg.slice("--name=".length);
      provided.add("name");
    }
    else if (arg.startsWith("--product-name=")) {
      const value = arg.slice("--product-name=".length);
      options.name = value;
      options.productName = value;
      provided.add("name");
      provided.add("productName");
    } else if (arg === "--check") {
      options.checks.push(takeValue());
      provided.add("checks");
    } else if (arg.startsWith("--check=")) {
      options.checks.push(arg.slice("--check=".length));
      provided.add("checks");
    } else if (arg === "--skip-init") {
      options.init = false;
      provided.add("init");
    } else if (arg === "--no-verify") {
      options.verify = false;
      provided.add("verify");
    } else if (arg === "--verify") {
      options.verify = true;
      provided.add("verify");
    }
    else throw new Error(`Unknown argument "${arg}".`);
  }

  Object.defineProperty(options, "_provided", {
    enumerable: false,
    value: provided,
  });
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
