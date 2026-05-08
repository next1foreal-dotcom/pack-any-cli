import path from "node:path";

export const goAdapter = {
  type: "go",
  label: "Go / go build",
  detectFiles: ["go.mod"],
  credits: [["Go", "https://go.dev/"]],
  createPlan(options, helpers) {
    const name = options.name || helpers.projectName(options.project);
    const outputDir = path.join(options.project, "dist");
    const exePath = path.join(outputDir, `${name}.exe`);
    const entry = options.entry || ".";

    return [
      {
        name: "Build Go executable",
        command: "go",
        args: ["build", "-o", exePath, entry],
        cwd: options.project,
        env: {
          GOOS: "windows",
          GOARCH: helpers.targetArch(options.target),
        },
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
