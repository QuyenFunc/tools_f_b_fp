const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const AccountManager = require('./managers/AccountManager');
const TaskQueue = require('./managers/TaskQueue');

const store = new Store({
  encryptionKey: 'fb-page-manager-secure-key'
});

let mainWindow;
let accountManager;
let taskQueue;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Mở DevTools trong chế độ dev
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  accountManager = new AccountManager(mainWindow);
  taskQueue = new TaskQueue();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== IPC HANDLERS ====================

// Saved accounts management
ipcMain.handle('get-saved-accounts', async () => {
  return accountManager.loadSavedAccounts();
});

ipcMain.handle('remove-saved-account', async (event, accountId) => {
  await accountManager.removeAccount(accountId);
  return { success: true };
});

ipcMain.handle('clear-all-saved-accounts', async () => {
  await accountManager.clearAll();
  return { success: true };
});

// Authentication
ipcMain.handle('login-facebook', async (event, { email, password, saveSession }) => {
  try {
    const FacebookAutomation = require('./automation/facebook');
    const accountId = Date.now().toString();
    const automation = new FacebookAutomation(mainWindow);
    
    // Login with headless mode (browser hidden)
    // DEBUG: Tạm thời hiển thị browser
    const result = await automation.login(email, password, false);
    
    if (result.success) {
      // Save session if requested
      let sessionData = null;
      if (saveSession) {
        sessionData = await automation.getSessionData();
      }
      
      await accountManager.addAccount(accountId, result.userName, sessionData, automation);
      
      return {
        success: true,
        accountId,
        userName: result.userName
      };
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('login-account-with-session', async (event, { accountId, sessionData }) => {
  try {
    const result = await accountManager.loginAccountWithSession(accountId, sessionData);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('logout-account', async (event, accountId) => {
  try {
    await accountManager.removeAccount(accountId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Fanpage operations
ipcMain.handle('get-fanpages', async (event, accountId) => {
  try {
    const automation = accountManager.getAutomation(accountId);
    if (!automation) {
      return {
        success: false,
        error: 'Tài khoản không tồn tại hoặc chưa đăng nhập'
      };
    }

    const pages = await automation.getFanpages();
    return {
      success: true,
      pages
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('select-fanpage', async (event, { accountId, pageId, pageInfo }) => {
  try {
    // CHỈ ĐÁNH DẤU fanpage đã chọn, KHÔNG tạo browser ngay
    // Browser sẽ được tạo khi thực sự cần upload/delete
    
    console.log(`✓ Đã chọn fanpage: ${pageInfo.name} (pageId: ${pageId})`);
    console.log('⏳ Browser sẽ được tạo khi cần upload/delete ảnh');
    
    return {
      success: true,
      photoCount: 0,
      message: 'Fanpage đã được chọn'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      photoCount: 0
    };
  }
});

// Photo operations
ipcMain.handle('scan-photos', async (event, { accountId, fanpageId, options }) => {
  try {
    const automation = accountManager.getAutomation(accountId);
    if (!automation) {
      return {
        success: false,
        error: 'Tài khoản không tồn tại'
      };
    }

    // Switch to fanpage first if needed
    if (fanpageId && automation.currentPageId !== fanpageId) {
      await automation.selectFanpage(fanpageId);
    }

    const photos = await automation.scanPhotos(options);
    return {
      success: true,
      photos
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('delete-photos', async (event, { accountId, fanpageId, photoIds, dryRun }) => {
  try {
    const automation = accountManager.getAutomation(accountId);
    const fanpageManager = accountManager.getFanpageManager(accountId);
    
    if (!automation || !fanpageManager) {
      return {
        success: false,
        error: 'Tài khoản không tồn tại'
      };
    }

    // Kiểm tra xem đã có browser cho fanpage chưa
    let fanpageBrowser = fanpageManager.getFanpageBrowser(fanpageId);
    
    // Nếu chưa có, TẠO browser cho fanpage này
    if (!fanpageBrowser) {
      console.log(`🔧 Tạo browser cho fanpage ${fanpageId} để delete...`);
      
      const pageInfo = {
        id: fanpageId,
        name: fanpageId,
        url: fanpageId.startsWith('http') ? fanpageId : 
             fanpageId.match(/^\d+$/) ? `https://www.facebook.com/profile.php?id=${fanpageId}` :
             `https://www.facebook.com/${fanpageId}`
      };
      
      const sessionState = await automation.getSessionState();
      
      const createResult = await fanpageManager.createFanpageBrowser(
        fanpageId,
        pageInfo,
        sessionState,
        false // DEBUG: Hiển thị browser
      );
      
      if (!createResult.success) {
        return {
          success: false,
          error: `Không thể tạo browser cho fanpage: ${createResult.error}`
        };
      }
      
      fanpageBrowser = fanpageManager.getFanpageBrowser(fanpageId);
    }

    // Sử dụng session từ browser riêng của fanpage
    const HeadlessDeleter = require('./automation/headless-deleter');
    const headlessDeleter = new HeadlessDeleter(mainWindow, 1);
    
    // Lấy session từ context của fanpage browser
    const sessionState = await fanpageBrowser.context.storageState();
    const fanpageUrl = fanpageBrowser.pageInfo.url;
    
    headlessDeleter.setSession(sessionState);
    
    // Xóa TẤT CẢ ảnh trên fanpage (không cần scan trước)
    const result = await headlessDeleter.deleteAllPhotosOnFanpage(fanpageUrl);
    
    // Close browser sau khi xong
    await headlessDeleter.close();
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Upload operations
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('get-photos-from-folder', async (event, folderPath) => {
  try {
    const files = fs.readdirSync(folderPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const photos = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => ({
        name: file,
        path: path.join(folderPath, file),
        size: fs.statSync(path.join(folderPath, file)).size
      }));

    return {
      success: true,
      photos
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('upload-photos-headless', async (event, { accountId, fanpageId, photos, captions }) => {
  try {
    const automation = accountManager.getAutomation(accountId);
    const fanpageManager = accountManager.getFanpageManager(accountId);
    
    if (!automation || !fanpageManager) {
      return {
        success: false,
        error: 'Tài khoản không tồn tại'
      };
    }

    // Kiểm tra xem đã có browser cho fanpage chưa
    let fanpageBrowser = fanpageManager.getFanpageBrowser(fanpageId);
    
    // Nếu chưa có, TẠO browser cho fanpage này
    if (!fanpageBrowser) {
      console.log(`🔧 Tạo browser cho fanpage ${fanpageId} để upload...`);
      
      // Lấy thông tin fanpage từ renderer (hoặc tìm trong danh sách)
      // Tạm thời dùng fanpageId làm pageInfo
      const pageInfo = {
        id: fanpageId,
        name: fanpageId,
        url: fanpageId.startsWith('http') ? fanpageId : 
             fanpageId.match(/^\d+$/) ? `https://www.facebook.com/profile.php?id=${fanpageId}` :
             `https://www.facebook.com/${fanpageId}`
      };
      
      const sessionState = await automation.getSessionState();
      
      const createResult = await fanpageManager.createFanpageBrowser(
        fanpageId,
        pageInfo,
        sessionState,
        false // DEBUG: Hiển thị browser
      );
      
      if (!createResult.success) {
        return {
          success: false,
          error: `Không thể tạo browser cho fanpage: ${createResult.error}`
        };
      }
      
      fanpageBrowser = fanpageManager.getFanpageBrowser(fanpageId);
    }

    // Sử dụng browser riêng của fanpage để upload
    const HeadlessUploader = require('./automation/headless-uploader');
    const headlessUploader = new HeadlessUploader(mainWindow, 10);
    
    // Lấy session từ context của fanpage browser
    const sessionState = await fanpageBrowser.context.storageState();
    const fanpageUrl = fanpageBrowser.pageInfo.url;
    
    await headlessUploader.setSession(sessionState, fanpageUrl);

    // Upload song song với caption
    const result = await headlessUploader.uploadPhotosParallel(photos, captions);
    
    // Close browser sau khi xong
    await headlessUploader.close();
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});
