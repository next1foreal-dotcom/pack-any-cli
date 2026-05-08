export function targetArch(target) {
  if (target.endsWith("arm64")) return "arm64";
  if (target.endsWith("ia32") || target.endsWith("x86")) return "386";
  return "amd64";
}

export function targetRuntime(target) {
  if (target === "win-arm64") return "win-arm64";
  if (target === "win-x86" || target === "win-ia32") return "win-x86";
  return "win-x64";
}
