const FacebookAutomation = require('../automation/facebook');
const FanpageManager = require('./FanpageManager');
const Store = require('electron-store');

class AccountManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    // accountId -> { automation, userName, sessionData, fanpageManager }
    this.accounts = new Map();
    this.store = new Store({
      encryptionKey: 'fb-page-manager-secure-key'
    });
    this.loadSavedAccounts();
  }

  // Load tất cả accounts đã lưu
  loadSavedAccounts() {
    const savedAccounts = this.store.get('accounts', []);
    return savedAccounts;
  }

  // Lưu accounts vào store
  saveAccounts() {
    const accountsData = [];
    this.accounts.forEach((data, accountId) => {
      accountsData.push({
        accountId,
        userName: data.userName,
        sessionData: data.sessionData
      });
    });
    this.store.set('accounts', accountsData);
  }

  // Thêm account mới
  async addAccount(accountId, userName, sessionData, automation) {
    const fanpageManager = new FanpageManager(this.mainWindow);
    this.accounts.set(accountId, {
      automation,
      userName,
      sessionData,
      fanpageManager
    });
    this.saveAccounts();
  }

  // Lấy automation instance của account
  getAutomation(accountId) {
    const account = this.accounts.get(accountId);
    return account ? account.automation : null;
  }

  // Lấy fanpage manager của account
  getFanpageManager(accountId) {
    const account = this.accounts.get(accountId);
    return account ? account.fanpageManager : null;
  }

  // Lấy tất cả accounts
  getAllAccounts() {
    const result = [];
    this.accounts.forEach((data, accountId) => {
      result.push({
        accountId,
        userName: data.userName,
        hasSession: !!data.sessionData
      });
    });
    return result;
  }

  // Xóa account
  async removeAccount(accountId) {
    const account = this.accounts.get(accountId);
    if (account) {
      if (account.automation) {
        await account.automation.close();
      }
      if (account.fanpageManager) {
        await account.fanpageManager.closeAll();
      }
    }
    this.accounts.delete(accountId);
    this.saveAccounts();
  }

  // Đăng nhập lại account từ session
  async loginAccountWithSession(accountId, sessionData, options = {}) {
    try {
      const automation = new FacebookAutomation(this.mainWindow);
      // Login with headless mode (browser hidden) - ALWAYS TRUE
      const headless = options.headless !== false; // Default true
      const result = await automation.loginWithSession(sessionData, headless);
      
      if (result.success) {
        const fanpageManager = new FanpageManager(this.mainWindow);
        this.accounts.set(accountId, {
          automation,
          userName: result.userName,
          sessionData,
          fanpageManager
        });
        return { success: true, userName: result.userName };
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xóa tất cả accounts
  async clearAll() {
    for (const [accountId, account] of this.accounts) {
      if (account.automation) {
        await account.automation.close();
      }
      if (account.fanpageManager) {
        await account.fanpageManager.closeAll();
      }
    }
    this.accounts.clear();
    this.store.delete('accounts');
  }
}

module.exports = AccountManager;

