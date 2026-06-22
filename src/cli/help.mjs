import { adapters } from "../adapters/index.mjs";

export function helpText() {
  return `pack-any

Usage:
  pack-any detect --project <path>
  pack-any init --project <path> --type vite-electron --product-name "My App"
  pack-any pack --project <path> --target win-x64
  pack-any pack --project <path> --type vite-electron --target mac-arm64
  pack-any workflow --project <path> --type vite-electron --target dmg
  pack-any pack --config pack-any.config.mjs
  pack-any pack --project <path> --type python --entry app.py
  pack-any pack --project <path> --type typescript --entry dist/index.js
  pack-any credits

Supported types:
  next-electron  Next.js desktop app via Electron + electron-builder
  vite-electron  Vite desktop app via Electron + electron-builder
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
  --config <path>           Read project defaults from a config file.
  --type <type|auto>        Project type. Defaults to auto.
  --target <target>         Defaults to win-x64. Electron also supports mac-x64, mac-arm64, mac-universal, dmg, and dir.
  --entry <file-or-dir>     Entry file/project when the adapter needs it.
  --input <dir>             Input/build directory for adapters such as Java or CMake.
  --main-class <class>      Java main class passed to jpackage.
  --name <name>             Output executable name.
  --product-name <name>     Alias for --name, useful for desktop apps.
  --check <script>          Package-script check for desktop adapters. Repeatable.
  --skip-init               Do not patch/write target project desktop files.
  --verify / --no-verify    Launch packaged app when supported. Default: verify.
  workflow                  Writes .github/workflows/build-macos.yml for manual GitHub Actions macOS builds.
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
