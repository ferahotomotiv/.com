const { app, BrowserWindow, shell, dialog, globalShortcut } = require("electron");
const path = require("path");

const APP_URL = "https://ferah-auto-service-management.vercel.app/";
const APP_ORIGIN = new URL(APP_URL).origin;

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    title: "FERAH AUTO",
    icon: path.join(__dirname, "ferah-auto-logo.png"),
    backgroundColor: "#090a0c",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.origin === APP_ORIGIN) return { action: "allow" };
      if (target.protocol === "https:") shell.openExternal(url);
    } catch (_) {}
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    try {
      const target = new URL(url);
      if (target.origin !== APP_ORIGIN) {
        event.preventDefault();
        if (target.protocol === "https:") shell.openExternal(url);
      }
    } catch (_) { event.preventDefault(); }
  });

  win.loadURL(APP_URL).catch(async () => {
    await dialog.showMessageBox(win, {
      type: "error",
      title: "FERAH AUTO bağlantı hatası",
      message: "FERAH AUTO sayfasına ulaşılamadı.",
      detail: "İnternet bağlantınızı kontrol edip uygulamayı yeniden açın."
    });
  });

  win.on("closed", () => globalShortcut.unregisterAll());
  globalShortcut.register("F11", () => win.setFullScreen(!win.isFullScreen()));
  globalShortcut.register("Escape", () => {
    if (win.isFullScreen()) win.setFullScreen(false);
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.ferahauto.desktop");
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("will-quit", () => globalShortcut.unregisterAll());
