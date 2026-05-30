const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getProducts: () => ipcRenderer.invoke('db:getProducts'),
  addProduct: (product) => ipcRenderer.invoke('db:addProduct', product),
  updateProduct: (product) => ipcRenderer.invoke('db:updateProduct', product),
  deleteProduct: (id) => ipcRenderer.invoke('db:deleteProduct', id),
  subtractQuantity: (id, quantity) => ipcRenderer.invoke('db:subtractQuantity', { id, quantity }),
  selectImage: () => ipcRenderer.invoke('dialog:selectImage'),
  copyImageToApp: (sourcePath) => ipcRenderer.invoke('image:copyToApp', sourcePath),
  resolveImagePath: (relativePath) => ipcRenderer.invoke('image:resolvePath', relativePath),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_, info) => callback(info)),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (_, p) => callback(p)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', () => callback()),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install')
});
