import path from "node:path";

export const rustAdapter = {
  type: "rust",
  label: "Rust / Cargo",
  detectFiles: ["Cargo.toml"],
  credits: [
    ["Rust", "https://www.rust-lang.org/"],
    ["Cargo", "https://doc.rust-lang.org/cargo/"],
  ],
  createPlan(options, helpers) {
    const name = options.name || helpers.projectName(options.project);
    const exePath = path.join(options.project, "target", "release", `${name}.exe`);

    return [
      {
        name: "Build Rust executable",
        command: "cargo",
        args: ["build", "--release"],
        cwd: options.project,
      },
      {
        name: "Show output paths",
        run: async () => {
          console.log(`Release executable: ${exePath}`);
        },
      },
    ];
  },
};
