import path from "node:path";
import { fsSync, readJson } from "../../utils/fs.mjs";

export async function printNextElectronOutputs(project, target) {
  const pkg = await readJson(path.join(project, "package.json"));
  const productName = pkg.build?.productName || pkg.name;
  const installerPath = path.join(project, "dist", `${productName}-${pkg.version || "0.0.0"}-win-x64.exe`);
  const unpackedPath = path.join(project, "dist", "win-unpacked", `${productName}.exe`);

  if (target !== "dir" && fsSync.existsSync(installerPath)) console.log(`Installer: ${installerPath}`);
  if (fsSync.existsSync(unpackedPath)) console.log(`Unpacked app: ${unpackedPath}`);
}
