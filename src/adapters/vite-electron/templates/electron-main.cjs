const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let mainWindow = null;
let staticServer = null;
let serverStarted = false;

function log(message) {
  try {
    fs.appendFileSync(path.join(app.getPath("userData"), "startup.log"), `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {
    // Best-effort startup log only.
  }
}

function readPackageJson(appRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(appRoot, "package.json"), "utf8"));
  } catch {
    return {};
  }
}

function getAppRoot() {
  return app.isPackaged ? app.getAppPath() : path.join(__dirname, "..");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 5173;
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

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return types[ext] || "application/octet-stream";
}

function resolveStaticFile(staticDir, requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);
  const root = path.resolve(staticDir);
  let filePath = path.resolve(root, `.${pathname}`);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) return null;

  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    filePath = path.join(root, "index.html");
  }

  return filePath;
}

async function startStaticServer(staticDir) {
  const port = await findFreePort();

  staticServer = http.createServer((request, response) => {
    const filePath = resolveStaticFile(staticDir, request.url || "/");
    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": contentType(filePath) });
      response.end(content);
    });
  });

  await new Promise((resolve, reject) => {
    staticServer.once("error", reject);
    staticServer.listen(port, "127.0.0.1", resolve);
  });

  log(`Static server ready on ${port}`);
  return `http://127.0.0.1:${port}`;
}

async function startOptionalBackend(appRoot, options) {
  if (serverStarted || options.serverEntry === false) return;

  const serverEntry = options.serverEntry || (fs.existsSync(path.join(appRoot, "server", "index.mjs")) ? "server/index.mjs" : null);
  if (!serverEntry) return;

  const serverPath = path.join(appRoot, serverEntry);
  const port = String(options.serverPort || process.env.PORT || 3001);
  process.env.NODE_ENV = "production";
  process.env.HOST = process.env.HOST || "127.0.0.1";
  process.env.PORT = port;
  process.env.PACK_ANY_ELECTRON = "1";

  log(`Starting backend from ${serverPath} on ${port}`);
  await import(pathToFileURL(serverPath).href);
  serverStarted = true;

  if (options.serverHealthPath !== false) {
    const healthPath = options.serverHealthPath || "/health";
    await waitForServer(`http://127.0.0.1:${port}${healthPath}`, 30000);
  }
  log("Backend server ready");
}

async function resolveAppUrl() {
  if (process.argv.includes("--dev")) {
    const url = process.env.ELECTRON_START_URL || "http://127.0.0.1:5173";
    await waitForServer(url, 60000);
    return url;
  }

  const appRoot = getAppRoot();
  const pkg = readPackageJson(appRoot);
  const options = pkg.packAny?.electron || {};
  await startOptionalBackend(appRoot, options);

  const staticDir = path.join(appRoot, options.staticDir || "dist");
  return startStaticServer(staticDir);
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
      log(`Startup failed: ${message}`);
      dialog.showErrorBox("Startup failed", `Unable to start ${app.name}:\n${message}`);
    });
  }
});

app.on("window-all-closed", () => {
  if (staticServer) staticServer.close();
  if (process.platform !== "darwin") app.quit();
});
