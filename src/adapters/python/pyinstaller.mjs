import path from "node:path";

export const pythonAdapter = {
  type: "python",
  label: "Python / PyInstaller",
  detectFiles: ["pyproject.toml", "requirements.txt"],
  credits: [
    ["Python", "https://www.python.org/"],
    ["PyInstaller", "https://pyinstaller.org/"],
    ["Nuitka", "https://nuitka.net/"],
  ],
  createPlan(options, helpers) {
    const entry = options.entry || "app.py";
    const name = options.name || helpers.projectName(options.project);
    const outputDir = path.join(options.project, "dist");
    const exePath = path.join(outputDir, `${name}.exe`);

    return [
      {
        name: "Install Python packaging dependency",
        command: "python",
        args: ["-m", "pip", "install", "pyinstaller"],
        cwd: options.project,
      },
      {
        name: "Build Python executable",
        command: "python",
        args: ["-m", "PyInstaller", "--onefile", "--name", name, "--distpath", outputDir, entry],
        cwd: options.project,
      },
      {
        name: "Show output paths",
        run: async () => {
          console.log(`Executable: ${exePath}`);
        },
      },
    ];
  },
};
