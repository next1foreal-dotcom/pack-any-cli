import { adapters } from "../adapters/index.mjs";

export function helpText() {
  return `pack-any

Usage:
  pack-any detect --project <path>
  pack-any init --project <path> --type next-electron --product-name "My App"
  pack-any pack --project <path> --target win-x64
  pack-any pack --project <path> --type python --entry app.py
  pack-any pack --project <path> --type typescript --entry dist/index.js
  pack-any credits

Supported v1 types:
  next-electron  Next.js desktop app via Electron + electron-builder
  typescript     TypeScript executable via tsc + yao-pkg
  python         Python executable via PyInstaller
  go             Go executable via go build
  dotnet         .NET executable via dotnet publish
  java           Java installer via jpackage
  rust           Rust executable via cargo build
  flutter        Flutter Windows app via flutter build windows
  cpp            C/C++ app via CMake

Options:
  --project, -p <path>      Target project. Defaults to current directory.
  --type <type|auto>        Project type. Defaults to auto.
  --target <target>         Defaults to win-x64.
  --entry <file-or-dir>     Entry file/project when the adapter needs it.
  --input <dir>             Input/build directory for adapters such as Java or CMake.
  --main-class <class>      Java main class passed to jpackage.
  --name <name>             Output executable name.
  --product-name <name>     Alias for --name, useful for desktop apps.
  --check <script>          Package-script check for next-electron. Repeatable.
  --skip-init               Do not patch/write target project desktop files.
  --verify / --no-verify    Launch packaged app when supported. Default: verify.
  -h, --help                Show help.
`;
}

export function upstreamCredits() {
  const lines = [
    "pack-any is an orchestration CLI. It calls mature upstream toolchains instead of replacing them.",
    "",
    "Primary upstream projects:",
  ];
  const seen = new Set();
  for (const adapter of adapters) {
    for (const [name, url] of adapter.credits || []) {
      if (seen.has(name)) continue;
      seen.add(name);
      lines.push(`  ${name.padEnd(18)} ${url}`);
    }
  }
  lines.push("");
  lines.push("The authors and maintainers of those projects did the hard platform work.");
  return lines.join("\n");
}
