import path from "node:path";

export const dotnetAdapter = {
  type: "dotnet",
  label: ".NET / dotnet publish",
  detectExtensions: [".csproj", ".sln"],
  credits: [[".NET / dotnet publish", "https://dotnet.microsoft.com/"]],
  createPlan(options, helpers) {
    const runtime = helpers.targetRuntime(options.target);
    const outputDir = path.join(options.project, "dist", runtime);
    const projectArg = options.entry ? [options.entry] : [];

    return [
      {
        name: "Publish .NET executable",
        command: "dotnet",
        args: [
          "publish",
          ...projectArg,
          "-c",
          "Release",
          "-r",
          runtime,
          "--self-contained",
          "true",
          "-p:PublishSingleFile=true",
          "-o",
          outputDir,
        ],
        cwd: options.project,
      },
      {
        name: "Show output paths",
        run: async () => {
          console.log(`Publish directory: ${outputDir}`);
        },
      },
    ];
  },
};
