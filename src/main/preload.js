const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Saved accounts management
  getSavedAccounts: () => ipcRenderer.invoke('get-saved-accounts'),
  removeSavedAccount: (accountId) => ipcRenderer.invoke('remove-saved-account', accountId),
  clearAllSavedAccounts: () => ipcRenderer.invoke('clear-all-saved-accounts'),
  
  // Authentication
  loginFacebook: (credentials) => ipcRenderer.invoke('login-facebook', credentials),
  loginAccountWithSession: (accountId, sessionData) => ipcRenderer.invoke('login-account-with-session', { accountId, sessionData }),
  logoutAccount: (accountId) => ipcRenderer.invoke('logout-account', accountId),
  
  // Fanpage operations
  getFanpages: (accountId) => ipcRenderer.invoke('get-fanpages', accountId),
  selectFanpage: (accountId, pageId, pageInfo) => ipcRenderer.invoke('select-fanpage', { accountId, pageId, pageInfo }),
  
  // Photo operations
  scanPhotos: (accountId, fanpageId, options) => ipcRenderer.invoke('scan-photos', { accountId, fanpageId, options }),
  deletePhotos: (accountId, fanpageId, data) => ipcRenderer.invoke('delete-photos', { accountId, fanpageId, ...data }),
  
  // Upload operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getPhotosFromFolder: (folderPath) => ipcRenderer.invoke('get-photos-from-folder', folderPath),
  uploadPhotosHeadless: (accountId, fanpageId, data) => ipcRenderer.invoke('upload-photos-headless', { accountId, fanpageId, ...data }),
  
  // Event listeners
  onLog: (callback) => ipcRenderer.on('log', (event, data) => callback(data)),
  onProgress: (callback) => ipcRenderer.on('progress', (event, data) => callback(data))
});
