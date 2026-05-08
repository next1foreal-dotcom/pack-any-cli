# Quality Notes

This document tracks what is verified today and what is intentionally still
limited. It is meant to keep the project honest.

## Verified

- Core project detection has automated tests.
- CLI argument aliases have automated tests.
- Adapter plan generation has automated tests.
- `next-electron`, `python`, `typescript`, and `.NET` have been exercised with
  real packaging flows on the maintainer machine.
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
- There is no stable config-file format yet. The CLI currently prefers explicit
  command-line options.
- The project is a v0.1 orchestration CLI. It intentionally delegates hard
  platform-specific packaging behavior to upstream tools.

## Next Hardening Steps

1. Add `pack-any.config.mjs` support for repeatable project settings.
2. Add more precise preflight checks per adapter.
3. Verify Go, Rust, Java, C/C++, and Flutter on matching toolchain machines.
4. Add release packaging for the CLI itself.
5. Publish to npm when command naming and config shape are settled.
