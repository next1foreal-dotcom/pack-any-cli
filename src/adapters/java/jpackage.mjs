import path from "node:path";
import { fsSync } from "../../utils/fs.mjs";

export const javaAdapter = {
  type: "java",
  label: "Java / jpackage",
  detectFiles: ["pom.xml", "build.gradle", "build.gradle.kts"],
  detectExtensions: [".java"],
  credits: [
    ["Java", "https://www.java.com/"],
    ["jpackage", "https://docs.oracle.com/en/java/javase/"],
    ["Maven", "https://maven.apache.org/"],
    ["Gradle", "https://gradle.org/"],
  ],
  createPlan(options, helpers) {
    const name = options.name || helpers.projectName(options.project);
    const inputDir = options.input || inferInputDir(options.project);
    const mainJar = options.entry || `${name}.jar`;
    const outputDir = path.join(options.project, "dist");
    const jpackageArgs = [
      "--type",
      "exe",
      "--name",
      name,
      "--input",
      inputDir,
      "--main-jar",
      mainJar,
      "--dest",
      outputDir,
    ];

    if (options.mainClass) {
      jpackageArgs.push("--main-class", options.mainClass);
    }

    return [
      createJavaBuildStep(options.project),
      {
        name: "Package Java app with jpackage",
        command: "jpackage",
        args: jpackageArgs,
        cwd: options.project,
      },
      {
        name: "Show output paths",
        run: async () => {
          console.log(`Installer directory: ${outputDir}`);
        },
      },
    ];
  },
};

function createJavaBuildStep(project) {
  if (fsSync.existsSync(path.join(project, "mvnw.cmd"))) {
    return { name: "Build Java project", command: "mvnw.cmd", args: ["-DskipTests", "package"], cwd: project };
  }
  if (fsSync.existsSync(path.join(project, "mvnw"))) {
    return { name: "Build Java project", command: "./mvnw", args: ["-DskipTests", "package"], cwd: project };
  }
  if (fsSync.existsSync(path.join(project, "pom.xml"))) {
    return { name: "Build Java project", command: "mvn", args: ["-DskipTests", "package"], cwd: project };
  }
  if (fsSync.existsSync(path.join(project, "gradlew.bat"))) {
    return { name: "Build Java project", command: "gradlew.bat", args: ["build"], cwd: project };
  }
  if (fsSync.existsSync(path.join(project, "gradlew"))) {
    return { name: "Build Java project", command: "./gradlew", args: ["build"], cwd: project };
  }
  return { name: "Build Java project", command: "gradle", args: ["build"], cwd: project };
}

function inferInputDir(project) {
  if (fsSync.existsSync(path.join(project, "target"))) return "target";
  return path.join("build", "libs");
}
