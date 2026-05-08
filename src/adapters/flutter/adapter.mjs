import path from "node:path";

export const flutterAdapter = {
  type: "flutter",
  label: "Flutter / flutter build windows",
  detectFiles: ["pubspec.yaml"],
  credits: [["Flutter", "https://flutter.dev/"]],
  createPlan(options) {
    const outputDir = path.join(options.project, "build", "windows", "x64", "runner", "Release");

    return [
      {
        name: "Build Flutter Windows app",
        command: "flutter",
        args: ["build", "windows", "--release"],
        cwd: options.project,
      },
      {
        name: "Show output paths",
        run: async () => {
          console.log(`Release directory: ${outputDir}`);
        },
      },
    ];
  },
};
