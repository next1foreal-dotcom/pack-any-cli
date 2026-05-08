import path from "node:path";

export const cppAdapter = {
  type: "cpp",
  label: "C/C++ / CMake",
  detectFiles: ["CMakeLists.txt"],
  credits: [
    ["CMake", "https://cmake.org/"],
    ["C/C++ toolchains", "https://isocpp.org/"],
  ],
  createPlan(options) {
    const buildDir = options.input || path.join(options.project, "build");

    return [
      {
        name: "Configure CMake project",
        command: "cmake",
        args: ["-S", options.project, "-B", buildDir, "-DCMAKE_BUILD_TYPE=Release"],
        cwd: options.project,
      },
      {
        name: "Build CMake project",
        command: "cmake",
        args: ["--build", buildDir, "--config", "Release"],
        cwd: options.project,
      },
      {
        name: "Show output paths",
        run: async () => {
          console.log(`Build directory: ${buildDir}`);
        },
      },
    ];
  },
};
