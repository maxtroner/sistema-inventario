const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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
  Menu.setApplicationMenu(null);
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

ipcMain.handle('dialog:saveFile', async (_, buffer, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, Buffer.from(buffer));
  return true;
});

ipcMain.handle('image:resolvePath', async (_, relativePath) => {
  return path.join(__dirname, relativePath);
});

ipcMain.handle('pdf:generate', async (_, { products, imgDir }) => {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const title = 'Reporte de Inventario';
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generado: ${date}`, { align: 'center' });
    doc.moveDown(1.5);

    const headers = ['Código', 'Artículo', 'Unidad', 'Familia / Periodo', 'E. Mínima', 'Stock'];
    const rows = products.map(p => [p.code, p.name, p.unidad || '', p.familia || '', String(p.minima), String(p.quantity)]);

    const tableTop = doc.y;
    const colWidths = [90, 200, 70, 130, 70, 70];
    const startX = 30;

    doc.fontSize(9).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, tableTop, colWidths[i], 18).fill('#0078d4');
      doc.fill('#ffffff').text(h, x + 4, tableTop + 4, { width: colWidths[i] - 8, align: 'left' });
      x += colWidths[i];
    });

    let y = tableTop + 18;
    doc.font('Helvetica').fontSize(8);
    rows.forEach((row, ri) => {
      x = startX;
      const bg = ri % 2 === 0 ? '#f5f5f5' : '#ffffff';
      row.forEach((cell, ci) => {
        doc.rect(x, y, colWidths[ci], 16).fill(bg);
        doc.fill('#1a1a1a').text(cell, x + 4, y + 3, { width: colWidths[ci] - 8, align: 'left' });
        x += colWidths[ci];
      });
      y += 16;

      if (y > 560) {
        doc.addPage();
        y = 30;
      }
    });

    doc.end();
  });
});
