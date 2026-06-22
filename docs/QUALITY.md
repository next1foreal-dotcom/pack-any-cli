# Quality Notes

This document tracks what is verified today and what is intentionally still
limited. It is meant to keep the project honest.

## Verified

- Core project detection has automated tests.
- CLI argument aliases have automated tests.
- Adapter plan generation has automated tests.
- `next-electron`, `python`, `typescript`, and `.NET` have been exercised with
  real packaging flows on the maintainer machine.
- `vite-electron` has automated detection, init, plan, and structure tests.
- `vite-electron` macOS targets are represented in plan generation:
  `mac-x64`, `mac-arm64`, `mac-universal`, `dmg`, and `mac-dir`.
- `workflow` has automated coverage for writing a manual GitHub Actions macOS
  build file and refusing to overwrite an existing workflow file.
- `verify:samples` builds and runs tiny sample executables when the matching
  toolchain is installed.
- Missing sample toolchains are reported as `skipped`, not counted as success.

## Known Limits

- Go, Rust, Java, C/C++, and Flutter adapters still need full machine-level
  verification on systems with those toolchains installed.
- Java packaging currently targets `jpackage --type exe`; cross-platform
  installer formats are not abstracted yet.
- Flutter packaging assumes the target project already has Windows desktop
  support enabled.
- `vite-electron` macOS artifact creation and `.app` launch verification require
  a macOS host. Windows can generate the plan, but it cannot prove the Mac app.
- `vite-electron` backend startup assumes a local Node entry such as
  `server/index.mjs`. Projects with custom backends should set
  `packAny.electron.serverEntry`, `serverPort`, and `serverHealthPath`.
- The config-file format is intentionally small in v0.2 and only covers the
  current CLI options. More adapter-specific fields can be added after real
  packaging usage proves they are needed.
- The project is a v0.2 orchestration CLI. It intentionally delegates hard
  platform-specific packaging behavior to upstream tools.

## Next Hardening Steps

1. Add more precise preflight checks per adapter.
2. Verify Go, Rust, Java, C/C++, and Flutter on matching toolchain machines.
3. Add release packaging for the CLI itself.
4. Publish to npm when command naming and config shape are settled.
