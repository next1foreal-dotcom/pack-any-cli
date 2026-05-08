# Contributing

Thanks for taking a look at `pack-any`.

The project goal is deliberately modest: provide a clean orchestration layer
over proven packaging tools, not replace those tools.

## Local Checks

```powershell
npm test
npm run smoke
npm run verify:samples
```

`verify:samples` may skip languages when the matching upstream toolchain is not
installed. A skip is acceptable in local development, but a new adapter should
include a tiny sample project and clear documentation about required commands.

## Adapter Guidelines

- Keep each adapter isolated under `src/adapters/<type>/`.
- Prefer official or widely used upstream packaging tools.
- Make output paths explicit in the final plan step.
- Do not hide missing toolchains or failed upstream commands.
- Add a small sample under `samples/` whenever practical.
- Credit upstream tools in the adapter `credits` list and in docs.

## Pull Request Shape

A good PR should include:

- a short explanation of the adapter or behavior change
- tests or sample verification
- documentation updates when user-facing behavior changes
- no generated `dist`, `build`, `bin`, `obj`, or `target` outputs
