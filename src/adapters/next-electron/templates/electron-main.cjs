const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("node:fs");
const Module = require("node:module");
const net = require("node:net");
const path = require("node:path");

let mainWindow = null;
let serverStarted = false;

function log(message) {
  try {
    fs.appendFileSync(path.join(app.getPath("userData"), "startup.log"), `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {
    // Best-effort startup log only.
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 3000;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function getStandaloneDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "app-next") : path.join(__dirname, "..", ".next", "standalone");
}

function getDependencyDirs(standaloneDir) {
  if (app.isPackaged) {
    return [
      path.join(process.resourcesPath, "app.asar", "node_modules"),
      path.join(standaloneDir, "node_modules"),
    ];
  }
  return [
    path.join(__dirname, "..", "node_modules"),
    path.join(standaloneDir, "node_modules"),
  ];
}

async function startStandaloneServer() {
  if (serverStarted) return Number(process.env.PORT || 3000);

  const port = await findFreePort();
  const standaloneDir = getStandaloneDir();
  const serverPath = path.join(standaloneDir, "server.js");
  log(`Starting standalone server from ${serverPath} on ${port}`);

  process.env.NODE_ENV = "production";
  process.env.PORT = String(port);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.NODE_PATH = [...getDependencyDirs(standaloneDir), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  Module._initPaths();

  require(serverPath);
  serverStarted = true;

  await waitForServer(`http://127.0.0.1:${port}`);
  log(`Standalone server ready on ${port}`);
  return port;
}

async function resolveAppUrl() {
  if (process.argv.includes("--dev")) {
    const url = process.env.ELECTRON_START_URL || "http://localhost:3000";
    await waitForServer(url, 60000);
    return url;
  }

  const port = await startStandaloneServer();
  return `http://127.0.0.1:${port}`;
}

async function createWindow() {
  const appUrl = await resolveAppUrl();
  log(`Loading ${appUrl}`);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 720,
    title: app.name,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(appUrl);
  log("Main window loaded");
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Startup failed: ${message}`);
    dialog.showErrorBox("Startup failed", `Unable to start ${app.name}:\n${message}`);
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      dialog.showErrorBox("Startup failed", `Unable to start ${app.name}:\n${message}`);
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
