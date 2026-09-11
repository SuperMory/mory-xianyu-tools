// 魔力咸鱼助手 - Electron 原生主进程入口
// 支持打包为 Windows .exe、macOS .dmg 与 Linux 安装包
const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    title: '魔力咸鱼助手 - 闲鱼多账号自动回复与发货管理系统',
    frame: false, // 无边框窗口，使用前端精美仿原生标题栏
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 拦截外链并在系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 窗口控制 IPC 通信
ipcMain.on('window-min', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-max', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow && mainWindow.close());

// 桌面系统通知 IPC
ipcMain.on('show-desktop-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || '魔力咸鱼助手提醒',
      body: body || '您有新的买家消息或订单发货通知',
    }).show();
  }
});

// App 生命周期
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
