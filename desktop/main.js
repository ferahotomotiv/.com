const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");

const APP_URL = "https://ferah-auto-service-management-ferahotomotiv.vercel.app/login";
const APP_ORIGIN = new URL(APP_URL).origin;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: "FERAH AUTO",
    icon: path.join(__dirname, "ferah-auto-logo.png"),
    backgroundColor: "#0b0d10",
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
      if (new URL(url).origin === APP_ORIGIN) {
        return { action: "allow" };
      }
    } catch (_) {}
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== APP_ORIGIN && parsed.protocol !== "https:") {
        event.preventDefault();
      } else if (parsed.origin !== APP_ORIGIN) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (_) {
      event.preventDefault();
    }
  });
  win.loadURL(APP_URL).catch(async () => {
    await dialog.showMessageBox(win, {
      type: "error",
      title: "FERAH AUTO bağlantı hatası",
      message: "FERAH AUTO sunucusuna ulaşılamadı.",
      detail: "Uygulamayı kullanmak için internet bağlantınızı kontrol edin ve yeniden deneyin."
    });
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
