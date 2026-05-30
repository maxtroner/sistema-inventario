const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database');

let mainWindow;
let updateChecker = null;

try {
  const { autoUpdater } = require('electron-updater');
  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:available', info);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:progress', progress);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update:downloaded');
    }
  });

  updateChecker = autoUpdater;
} catch (e) {
  console.log('Auto-updater no disponible');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: 'Sistema de Inventario',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  if (updateChecker) {
    setTimeout(() => updateChecker.checkForUpdates(), 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('update:check', () => {
  if (updateChecker) updateChecker.checkForUpdates();
});

ipcMain.handle('update:download', () => {
  if (updateChecker) updateChecker.downloadUpdate();
});

ipcMain.handle('update:install', () => {
  if (updateChecker) updateChecker.quitAndInstall();
});

ipcMain.handle('db:getProducts', () => {
  return db.getProducts();
});

ipcMain.handle('db:addProduct', (_, product) => {
  return db.addProduct(product);
});

ipcMain.handle('db:updateProduct', (_, product) => {
  return db.updateProduct(product);
});

ipcMain.handle('db:deleteProduct', (_, id) => {
  return db.deleteProduct(id);
});

ipcMain.handle('db:subtractQuantity', (_, { id, quantity }) => {
  return db.subtractQuantity(id, quantity);
});

ipcMain.handle('dialog:selectImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('image:copyToApp', async (_, sourcePath) => {
  const ext = path.extname(sourcePath);
  const fileName = `prod_${Date.now()}${ext}`;
  const destDir = path.join(__dirname, 'products_img');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, fileName);
  fs.copyFileSync(sourcePath, destPath);
  return `products_img/${fileName}`;
});

ipcMain.handle('image:resolvePath', async (_, relativePath) => {
  return path.join(__dirname, relativePath);
});
