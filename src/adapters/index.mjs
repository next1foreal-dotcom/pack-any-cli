import { dotnetAdapter } from "./dotnet/adapter.mjs";
import { cppAdapter } from "./cpp/cmake.mjs";
import { flutterAdapter } from "./flutter/adapter.mjs";
import { goAdapter } from "./go/adapter.mjs";
import { javaAdapter } from "./java/jpackage.mjs";
import { nextElectronAdapter } from "./next-electron/adapter.mjs";
import { pythonAdapter } from "./python/pyinstaller.mjs";
import { rustAdapter } from "./rust/cargo.mjs";
import { typeScriptAdapter } from "./typescript/pkg.mjs";

export const adapters = [
  nextElectronAdapter,
  typeScriptAdapter,
  pythonAdapter,
  goAdapter,
  dotnetAdapter,
  javaAdapter,
  rustAdapter,
  flutterAdapter,
  cppAdapter,
];

export function getAdapter(type) {
  const adapter = adapters.find((item) => item.type === type);
  if (!adapter) throw new Error(`Unsupported project type "${type}".`);
  return adapter;
}
