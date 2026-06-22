# Changelog

## 0.2.1 - 2026-06-15

- Added `pack-any workflow` to generate a manual GitHub Actions macOS build workflow.
- The generated workflow targets private-repo friendly manual runs and uploads `.dmg`, `.zip`, or `.app` artifacts.

## 0.2.0 - 2026-06-15

- Added `vite-electron` for Vite web apps packaged with Electron and electron-builder.
- Added Electron macOS targets: `mac-x64`, `mac-arm64`, `mac-universal`, `dmg`, and `mac-dir`.
- Added macOS launch verification hooks for packaged `.app` outputs.
- Kept macOS packaging honest: Mac targets require a macOS build host.

## 0.1.0 - 2026-05-08

- Initial orchestration CLI.
- Added adapters for `next-electron`, `typescript`, `python`, `go`, `dotnet`, `java`, `rust`, `flutter`, and `cpp`.
