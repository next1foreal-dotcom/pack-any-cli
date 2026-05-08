# Acknowledgements

`pack-any-cli` is an orchestration layer. It detects a project type, chooses an
adapter, and calls established upstream tooling. It does not claim to replace
or reimplement those projects.

## Primary Upstream Projects

| Project | Role in `pack-any` | Typical license |
| --- | --- | --- |
| [Electron](https://www.electronjs.org/) | Desktop runtime for web apps | MIT |
| [electron-builder](https://www.electron.build/) | Electron packaging and installer generation | MIT |
| [Next.js](https://nextjs.org/) | Standalone server output used by the Next/Electron adapter | MIT |
| [NSIS](https://nsis.sourceforge.io/) | Windows installer target used through electron-builder | zlib/libpng style license |
| [TypeScript](https://www.typescriptlang.org/) | TypeScript compiler | Apache-2.0 |
| [Node.js](https://nodejs.org/) | Runtime targeted by the TypeScript adapter | MIT, with bundled third-party notices |
| [yao-pkg](https://github.com/yao-pkg/pkg) | Packages Node.js applications into executables | MIT |
| [Python](https://www.python.org/) | Python runtime and packaging ecosystem | PSF License Agreement |
| [PyInstaller](https://pyinstaller.org/) | Packages Python applications into executables | GPL-2.0 with PyInstaller bootloader exception |
| [Nuitka](https://nuitka.net/) | Planned Python alternative adapter | AGPL-3.0 with runtime exception in the current upstream repository; older releases may differ |
| [Go](https://go.dev/) | `go build` toolchain | BSD-3-Clause |
| [.NET](https://dotnet.microsoft.com/) | `dotnet publish` for self-contained applications | MIT |
| [Java / OpenJDK](https://openjdk.org/) | JDK tools such as `jpackage` | GPL-2.0 with Classpath Exception |
| [Maven](https://maven.apache.org/) | Java builds | Apache-2.0 |
| [Gradle](https://gradle.org/) | Java builds | Apache-2.0 |
| [Rust](https://www.rust-lang.org/) | Rust builds | MIT OR Apache-2.0 |
| [Cargo](https://doc.rust-lang.org/cargo/) | Rust package manager and build tool | MIT OR Apache-2.0 |
| [Flutter](https://flutter.dev/) | Flutter Windows desktop builds | BSD-3-Clause |
| [CMake](https://cmake.org/) | C and C++ native build coordination | BSD-3-Clause |

License names above are a practical reference for orientation. Always review
the current upstream license files before redistributing those tools or bundled
outputs.

## Project Positioning

The goal is to provide a convenient command surface for agents and developers:

```powershell
pack-any detect --project D:\app
pack-any pack --project D:\app --type python --entry app.py
pack-any pack --project D:\app --type next-electron
```

The actual packaging work belongs to the upstream toolchains. This project
adds glue code, templates, conventions, and smoke verification.

## License Note

Before redistributing packaged applications, review the licenses of the target
application, its dependencies, and the upstream packaging tools involved. This
acknowledgement is not legal advice.
