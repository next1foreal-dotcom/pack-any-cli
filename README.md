# pack-any-cli

[![CI](https://github.com/next1foreal-dotcom/pack-any-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/next1foreal-dotcom/pack-any-cli/actions/workflows/ci.yml)

[简体中文](./README.zh-CN.md) | English

Current version: `0.2.2`.

`pack-any` is a small orchestration CLI for packaging common project types by
calling proven upstream toolchains. It is not a replacement for those tools.

## Status

This is a v0.2 orchestration CLI. The core CLI, project detection, adapter plan
generation, and several real packaging flows are verified. Some adapters still
need full machine-level verification on systems with the matching toolchains.

See [docs/QUALITY.md](./docs/QUALITY.md) for the current verification matrix
and known limits.

## Supported Adapters

| Type | Detects | Upstream toolchain | Typical command |
| --- | --- | --- | --- |
| `next-electron` | `package.json` with Next.js | Electron, electron-builder, Next.js, NSIS | `electron-builder --win nsis` |
| `vite-electron` | `package.json` with Vite and `index.html` | Electron, electron-builder, Vite | `electron-builder --mac dmg` or `electron-builder --win nsis` |
| `typescript` | `tsconfig.json`, TypeScript dependency | TypeScript, Node.js, yao-pkg | `tsc`, `@yao-pkg/pkg` |
| `python` | `pyproject.toml`, `requirements.txt` | Python, PyInstaller, optional Nuitka later | `python -m PyInstaller --onefile` |
| `go` | `go.mod` | Go toolchain | `go build` |
| `dotnet` | `.csproj`, `.sln` | .NET SDK | `dotnet publish --self-contained -p:PublishSingleFile=true` |
| `java` | `pom.xml`, `build.gradle`, `.java` | JDK, jpackage, Maven/Gradle | `jpackage --type exe` |
| `rust` | `Cargo.toml` | Rust, Cargo | `cargo build --release` |
| `flutter` | `pubspec.yaml` | Flutter SDK | `flutter build windows --release` |
| `cpp` | `CMakeLists.txt` | CMake, platform compiler | `cmake --build` |

Tauri-specific and Nuitka-specific adapters are planned as later additions.

## Project Structure

```text
pack-any-cli/
  bin/
    pack-any.mjs                  CLI executable entry
  src/
    cli/                          argument parsing and help text
    core/                         detection, planning, and plan execution
    adapters/                     one adapter per upstream packaging toolchain
      next-electron/              Next.js + Electron + electron-builder adapter
        templates/                files written into target Next projects
      vite-electron/              Vite + Electron + electron-builder adapter
        templates/                files written into target Vite projects
      typescript/                 tsc + yao-pkg adapter
      python/                     PyInstaller adapter
      go/                         go build adapter
      dotnet/                     dotnet publish adapter
      java/                       jpackage adapter
      rust/                       Cargo adapter
      flutter/                    Flutter desktop adapter
      cpp/                        CMake adapter
    verify/                       packaged app smoke checks
    utils/                        small shared filesystem, naming, target helpers
    core.mjs                      stable public facade for tests and CLI
  samples/                        tiny projects used by verify:samples
  scripts/                        repo maintenance and verification scripts
  test/                           behavior and structure tests
  ACKNOWLEDGEMENTS.md             upstream credits and project positioning
```

The intended module shape is:

- `cli` knows how users talk to the tool.
- `core` knows how to choose and run a plan.
- each `adapter` knows one packaging ecosystem.
- `verify` knows how to check produced artifacts.
- `utils` contains boring shared helpers only.

## Usage

```powershell
node bin\pack-any.mjs --help
node bin\pack-any.mjs detect --project D:\path\to\app
node bin\pack-any.mjs pack --config D:\path\to\app\pack-any.config.mjs
node bin\pack-any.mjs pack --project D:\path\to\next-app --type next-electron --target win-x64
node bin\pack-any.mjs pack --project D:\path\to\vite-app --type vite-electron --target mac-arm64
node bin\pack-any.mjs pack --project D:\path\to\vite-app --type vite-electron --target dmg
node bin\pack-any.mjs workflow --project D:\path\to\vite-app --type vite-electron --target dmg
node bin\pack-any.mjs pack --project D:\path\to\ts-app --type typescript --entry dist\index.js
node bin\pack-any.mjs pack --project D:\path\to\python-app --type python --entry app.py
node bin\pack-any.mjs pack --project D:\path\to\go-app --type go
node bin\pack-any.mjs pack --project D:\path\to\dotnet-app --type dotnet --entry MyApp.csproj
node bin\pack-any.mjs pack --project D:\path\to\java-app --type java --input target --entry app.jar
node bin\pack-any.mjs pack --project D:\path\to\rust-app --type rust
node bin\pack-any.mjs pack --project D:\path\to\flutter-app --type flutter
node bin\pack-any.mjs pack --project D:\path\to\cpp-app --type cpp
```

## Sample Verification

This repository includes tiny sample projects for real packaging checks:

```powershell
pnpm run verify:samples
```

The script builds and runs sample executables when the required upstream
toolchain is installed. Missing toolchains are reported as `skipped`, not
silently treated as passing.

Verified on this machine:

| Type | Sample | Verification |
| --- | --- | --- |
| `python` | `samples/python-hello` | builds exe and prints `hello from python` |
| `typescript` | `samples/typescript-hello` | builds exe and prints `hello from typescript` |
| `dotnet` | `samples/dotnet-hello` | builds exe and prints `hello from dotnet` |
| `next-electron` | external `../fashion-ai` project | builds unpacked Electron app and passes launch smoke test |

Included but skipped on this machine because the required tools are not
available in `PATH`:

| Type | Sample | Required commands |
| --- | --- | --- |
| `go` | `samples/go-hello` | `go` |
| `rust` | `samples/rust-hello` | `cargo` |
| `cpp` | `samples/cpp-hello` | `cmake` plus a platform C++ compiler |
| `java` | `samples/java-hello` | `java`, `jpackage`, `mvn` |

Flutter support is implemented as an adapter, but a full Flutter desktop sample
should be created with `flutter create` on a machine with Flutter installed.

After linking locally:

```powershell
npm link
pack-any pack --project D:\path\to\app
```

## Config Files

`pack-any` can read project defaults from:

- `pack-any.config.mjs`
- `pack-any.config.js`
- `pack-any.config.json`

When no `--config` is passed, the CLI looks for those files in `--project`
or the current directory. Command-line flags always override config values.

```js
// pack-any.config.mjs
export default {
  type: "next-electron",
  project: ".",
  productName: "My App",
  target: "win-x64",
  checks: ["lint", "test"],
  verify: true
};
```

Then run:

```powershell
pack-any pack
```

Supported config fields mirror the current CLI options:
`type`, `project`, `target`, `entry`, `input`, `mainClass`, `name`,
`productName`, `checks`, `verify`, `init`, and `skipInit`.

## Next / Electron Example

```powershell
pack-any pack --project D:\path\to\next-app --type next-electron --product-name "My App" --check lint
```

This adapter writes Electron launcher files into the target project, patches
`package.json`, enables Next standalone output, builds the app, runs optional
checks, creates a Windows installer, and verifies launch when possible.

## Vite / Electron Example

```powershell
pack-any init --project D:\path\to\vite-app --type vite-electron --product-name "My App"
pack-any pack --project D:\path\to\vite-app --type vite-electron --target win-x64
pack-any pack --project D:\path\to\vite-app --type vite-electron --target mac-arm64
pack-any pack --project D:\path\to\vite-app --type vite-electron --target dmg
pack-any workflow --project D:\path\to\vite-app --type vite-electron --target dmg
```

The `vite-electron` adapter writes Electron launcher files, patches
`package.json`, builds the Vite app, calls electron-builder, and prints any
`.exe`, `.app`, or `.dmg` outputs it can find.

Supported Electron targets:

| Target | Output intent | Host requirement |
| --- | --- | --- |
| `win-x64` | Windows NSIS installer | Windows recommended |
| `win-arm64` | Windows ARM64 NSIS installer | Windows recommended |
| `mac-x64` | Intel macOS DMG | macOS required |
| `mac-arm64` | Apple Silicon macOS DMG | macOS required |
| `mac-universal` | Universal macOS DMG | macOS required |
| `dmg` | Alias for universal macOS DMG | macOS required |
| `dir` | Unpacked Electron app for the current platform | Matching platform recommended |
| `mac-dir` | Unpacked macOS `.app` | macOS required |

If the target project has `server/index.mjs`, init records it under
`package.json` as `packAny.electron.serverEntry`. The generated Electron main
process starts that backend before loading the Vite UI. Adjust
`packAny.electron.serverPort` or `packAny.electron.serverHealthPath` when a
project uses a different local API port or health route.

The `workflow` command writes `.github/workflows/build-macos.yml` into the
target project. The generated workflow is manual-only (`workflow_dispatch`), so
private repositories do not spend GitHub Actions minutes on every push. It runs
on `macos-latest`, installs npm dependencies, builds the Vite app, creates the
macOS package with electron-builder, checks that a `.dmg`, `.zip`, or `.app`
exists, and uploads the result as a workflow artifact.

## TypeScript Example

```powershell
pack-any pack --project D:\path\to\ts-app --type typescript --entry dist\index.js --name my-tool
```

The TypeScript adapter compiles with `tsc -p tsconfig.json`, then packages the
compiled JavaScript entry with `@yao-pkg/pkg`.

## Python Example

```powershell
pack-any pack --project D:\path\to\python-app --type python --entry app.py --name MyTool
```

The Python adapter calls PyInstaller. It assumes Python and pip are available.

## Go Example

```powershell
pack-any pack --project D:\path\to\go-app --type go --name my-tool
```

The Go adapter calls `go build` with `GOOS=windows` and `GOARCH=amd64` for
`win-x64`.

## .NET Example

```powershell
pack-any pack --project D:\path\to\dotnet-app --type dotnet --entry MyApp.csproj
```

The .NET adapter calls `dotnet publish` with self-contained single-file output.

## Java Example

```powershell
pack-any pack --project D:\path\to\java-app --type java --input target --entry my-app.jar --main-class com.example.Main
```

The Java adapter builds with Maven or Gradle when it detects those files, then
calls `jpackage`. For reliable results, pass the jar directory with `--input`
and the jar file name with `--entry`.

## Rust Example

```powershell
pack-any pack --project D:\path\to\rust-app --type rust --name my-tool
```

The Rust adapter calls `cargo build --release`.

## Flutter Example

```powershell
pack-any pack --project D:\path\to\flutter-app --type flutter
```

The Flutter adapter calls `flutter build windows --release`.

## C/C++ Example

```powershell
pack-any pack --project D:\path\to\cpp-app --type cpp
```

The C/C++ adapter calls CMake configure and build commands. Pass `--input` to
choose a custom build directory.

## Acknowledgements

This project stands on the shoulders of the authors and maintainers of Electron,
electron-builder, Vite, Next.js, TypeScript, Node.js, yao-pkg, PyInstaller, Python,
Go, .NET, Java, jpackage, Cargo, Flutter, CMake, and NSIS. `pack-any` only wires
those tools into a repeatable workflow.

Run:

```powershell
pack-any credits
```

See [ACKNOWLEDGEMENTS.md](./ACKNOWLEDGEMENTS.md) for details.
See [CHANGELOG.md](./CHANGELOG.md) for versioned capability notes.

## Contributing

Adapter contributions are welcome when they keep the project as a thin
orchestration layer over proven upstream tools. See
[CONTRIBUTING.md](./CONTRIBUTING.md).
