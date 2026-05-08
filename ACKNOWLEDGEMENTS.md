# Acknowledgements

`pack-any-cli` is an orchestration layer. It detects a project type, chooses an
adapter, and calls established upstream tooling. It does not claim to replace
or reimplement those projects.

## Primary Upstream Projects

- [Electron](https://www.electronjs.org/) provides the desktop runtime for web apps.
- [electron-builder](https://www.electron.build/) provides Electron packaging and installer generation.
- [Next.js](https://nextjs.org/) provides the standalone server output used by the Next/Electron adapter.
- [NSIS](https://nsis.sourceforge.io/) is used by electron-builder's Windows installer target.
- [TypeScript](https://www.typescriptlang.org/) provides the compiler for TypeScript projects.
- [Node.js](https://nodejs.org/) provides the runtime targeted by the TypeScript adapter.
- [yao-pkg](https://github.com/yao-pkg/pkg) packages Node.js applications into executables.
- [Python](https://www.python.org/) provides the Python runtime and packaging ecosystem.
- [PyInstaller](https://pyinstaller.org/) packages Python applications into executables.
- [Nuitka](https://nuitka.net/) is acknowledged as a planned Python alternative adapter.
- [Go](https://go.dev/) provides the `go build` toolchain.
- [.NET](https://dotnet.microsoft.com/) provides `dotnet publish` for self-contained applications.
- [Java](https://www.java.com/) and the JDK provide `jpackage` for native packaging.
- [Maven](https://maven.apache.org/) and [Gradle](https://gradle.org/) are used for Java builds.
- [Rust](https://www.rust-lang.org/) and [Cargo](https://doc.rust-lang.org/cargo/) provide Rust builds.
- [Flutter](https://flutter.dev/) provides Windows desktop builds for Flutter apps.
- [CMake](https://cmake.org/) coordinates C and C++ native builds.

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
application and its dependencies. This acknowledgement is not legal advice.
