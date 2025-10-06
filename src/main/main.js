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
    width: 1920,
    height: 1080,
    minWidth: 1200,
    minHeight: 800,
    fullscreen: false, // Có thể bật F11 để fullscreen
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
ipcMain.handle('login-facebook', async (event, { email, password, saveSession, twoFASecret }) => {
  try {
    const accountId = Date.now().toString();
    
    // Nếu có 2FA secret, dùng FacebookWith2FA
    if (twoFASecret && twoFASecret.trim()) {
      const FacebookWith2FA = require('./automation/FacebookWith2FA');
      const automation = new FacebookWith2FA(mainWindow);
      
      const result = await automation.loginWith2FA({
        email,
        password,
        twoFASecret: twoFASecret.trim()
      }, false); // Hiển thị browser để debug 2FA
      
      if (result.success) {
        // Save account
        let sessionData = null;
        if (saveSession) {
          sessionData = result.sessionData;
        }
        
        // Chuyển sang FacebookAutomation thường để quản lý
        const FacebookAutomation = require('./automation/facebook');
        const normalAutomation = new FacebookAutomation(mainWindow);
        normalAutomation.browser = automation.browser;
        normalAutomation.context = automation.context;
        normalAutomation.page = automation.page;
        
        await accountManager.addAccount(accountId, result.userName, sessionData, normalAutomation);
        
        return {
          success: true,
          accountId,
          userName: result.userName
        };
      }
      
      return result;
    }
    
    // Login thường (không có 2FA)
    const FacebookAutomation = require('./automation/facebook');
    const automation = new FacebookAutomation(mainWindow);
    
    // Login with headless mode (browser hidden)
    const result = await automation.login(email, password, true); // ⚡ HEADLESS: true
    
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

// Login with 2FA
ipcMain.handle('login-facebook-with-2fa', async (event, credentials) => {
  try {
    const FacebookWith2FA = require('./automation/FacebookWith2FA');
    const path = require('path');
    const os = require('os');
    
    const accountId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const automation = new FacebookWith2FA(mainWindow);
    
    // Tạo thư mục persistent context cho account này
    const userDataDir = path.join(os.tmpdir(), 'fb-page-manager-profiles', accountId);
    
    const result = await automation.loginWith2FA(credentials, false, userDataDir); // Hiển thị browser + persistent
    
    if (result.success) {
      // Chuyển sang FacebookAutomation thường để quản lý
      const FacebookAutomation = require('./automation/facebook');
      const normalAutomation = new FacebookAutomation(mainWindow);
      normalAutomation.browser = automation.browser;
      normalAutomation.context = automation.context;
      normalAutomation.page = automation.page;
      
      await accountManager.addAccount(accountId, result.userName, result.sessionData, normalAutomation);
      
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

// Parse accounts text
ipcMain.handle('parse-accounts-text', async (event, text) => {
  try {
    const AccountImporter = require('./utils/AccountImporter');
    const accounts = AccountImporter.parseMultipleLines(text);
    
    // Validate each account
    const validatedAccounts = accounts.map(account => {
      const validation = AccountImporter.validate(account);
      return {
        ...account,
        valid: validation.valid,
        errors: validation.errors
      };
    });
    
    return {
      success: true,
      accounts: validatedAccounts
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Import multiple accounts with 2FA - PARALLEL VERSION
ipcMain.handle('import-accounts-with-2fa', async (event, accounts) => {
  try {
    const FacebookWith2FA = require('./automation/FacebookWith2FA');
    const FacebookAutomation = require('./automation/facebook');
    const path = require('path');
    const os = require('os');
    
    console.log(`🚀 Bắt đầu đăng nhập SONG SONG ${accounts.length} tài khoản...`);
    
    // ĐĂNG NHẬP SONG SONG TẤT CẢ
    const loginPromises = accounts.map(async (account, index) => {
      try {
        console.log(`[${index + 1}/${accounts.length}] Đăng nhập ${account.email}...`);
        
        const accountId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
        const automation = new FacebookWith2FA(mainWindow);
        
        // Tạo persistent context cho mỗi account
        const userDataDir = path.join(os.tmpdir(), 'fb-page-manager-profiles', accountId);
        
        const result = await automation.loginWith2FA({
          email: account.email,
          password: account.password,
          twoFASecret: account.twoFASecret
        }, true, userDataDir); // Headless + persistent
        
        if (result.success) {
          console.log(`✅ [${index + 1}/${accounts.length}] Thành công: ${account.email}`);
          
          // Chuyển sang FacebookAutomation thường
          const normalAutomation = new FacebookAutomation(mainWindow);
          normalAutomation.browser = automation.browser;
          normalAutomation.context = automation.context;
          normalAutomation.page = automation.page;
          
          await accountManager.addAccount(accountId, result.userName, result.sessionData, normalAutomation);
          
          return {
            success: true,
            email: account.email,
            userName: result.userName,
            accountId
          };
        } else {
          console.log(`❌ [${index + 1}/${accounts.length}] Thất bại: ${account.email} - ${result.error}`);
          
          return {
            success: false,
            email: account.email,
            error: result.error
          };
        }
      } catch (error) {
        console.log(`❌ [${index + 1}/${accounts.length}] Exception: ${account.email} - ${error.message}`);
        
        return {
          success: false,
          email: account.email,
          error: error.message
        };
      }
    });
    
    // Đợi TẤT CẢ hoàn thành
    const results = await Promise.all(loginPromises);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log(`✅ Hoàn tất: ${successCount} thành công, ${failedCount} thất bại`);
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('❌ Lỗi import accounts:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('login-account-with-session', async (event, { accountId, sessionData, options }) => {
  try {
    const result = await accountManager.loginAccountWithSession(accountId, sessionData, options);
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
    // KHÔNG CẦN SCAN NỮA - Chỉ trả về message
    // Vì logic xóa mới không cần biết số ảnh trước
    console.log(`⚠️ scan-photos deprecated - không cần scan nữa`);
    
    return {
      success: true,
      photos: [],
      message: 'Không cần scan - xóa trực tiếp tất cả ảnh'
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
        false // 🔍 DEBUG MODE: Hiển thị browser để debug
      );
      
      if (!createResult.success) {
        return {
          success: false,
          error: `Không thể tạo browser cho fanpage: ${createResult.error}`
        };
      }
      
      fanpageBrowser = fanpageManager.getFanpageBrowser(fanpageId);
    }

    // SỬ DỤNG page của fanpage browser đã có sẵn
    const HeadlessDeleter = require('./automation/headless-deleter');
    const headlessDeleter = new HeadlessDeleter(mainWindow, 5); // Tăng từ 1 → 5 browsers
    
    const fanpageUrl = fanpageBrowser.pageInfo.url;
    
    // Xóa TẤT CẢ ảnh trên fanpage - DÙNG PAGE CÓ SẴN
    const result = await headlessDeleter.deleteAllPhotosOnPage(
      fanpageBrowser.page, 
      fanpageUrl, 
      1
    );
    
    // KHÔNG close browser (để user có thể tiếp tục dùng)
    
    return {
      success: true,
      deleted: result.deleted,
      failed: result.failed,
      total: result.deleted + result.failed
    };
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
        true // ⚡ HEADLESS: true
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
    const headlessUploader = new HeadlessUploader(mainWindow, 15); // Tăng từ 10 → 15 browsers
    
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
