# pack-any-cli

`pack-any` is a small orchestration CLI for packaging common project types by
calling proven upstream toolchains. It is not a replacement for those tools.

## Supported v1 Adapters

| Type | Detects | Upstream toolchain | Typical command |
| --- | --- | --- | --- |
| `next-electron` | `package.json` with Next.js | Electron, electron-builder, Next.js, NSIS | `electron-builder --win nsis` |
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
node bin\pack-any.mjs pack --project D:\path\to\next-app --type next-electron --target win-x64
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

## Next / Electron Example

```powershell
pack-any pack --project D:\path\to\next-app --type next-electron --product-name "My App" --check lint
```

This adapter writes Electron launcher files into the target project, patches
`package.json`, enables Next standalone output, builds the app, runs optional
checks, creates a Windows installer, and verifies launch when possible.

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
electron-builder, Next.js, TypeScript, Node.js, yao-pkg, PyInstaller, Python,
Go, .NET, Java, jpackage, Cargo, Flutter, CMake, and NSIS. `pack-any` only wires
those tools into a repeatable workflow.

Run:

```powershell
pack-any credits
```

See [ACKNOWLEDGEMENTS.md](./ACKNOWLEDGEMENTS.md) for details.
