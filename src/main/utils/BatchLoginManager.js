const FacebookWith2FA = require('../automation/FacebookWith2FA');
const FacebookAdvanced = require('../automation/FacebookAdvanced');
const SessionManager = require('./SessionManager');
const AccountLifecycle = require('./AccountLifecycle');
const StealthConfig = require('./StealthConfig');

/**
 * BATCH LOGIN MANAGER - ENTERPRISE LEVEL
 * 
 * Parse và login tự động nhiều accounts từ chuỗi
 * Format: accountId|password|2faSecret|email|password2|email2
 * Example: 61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com|Moimedia@@@|chelcabulamoi@smvmail.com
 */
class BatchLoginManager {
  constructor(mainWindow, options = {}) {
    this.mainWindow = mainWindow;
    this.sessionManager = new SessionManager();
    this.lifecycle = new AccountLifecycle();
    this.proxyManager = options.proxyManager || null;
    
    // Results tracking
    this.results = [];
    this.successCount = 0;
    this.failedCount = 0;
  }

  log(message, type = 'info') {
    const logData = {
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('batch-log', logData);
    }
  }

  progress(current, total, message) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('batch-progress', { 
        current, 
        total, 
        message,
        successCount: this.successCount,
        failedCount: this.failedCount,
      });
    }
  }

  /**
   * PARSE ACCOUNT STRING
   * Format: accountId|password|2faSecret|email|password2|email2
   * 
   * accountId: Facebook user ID (số)
   * password: Mật khẩu đăng nhập (có thể giống hoặc khác password2)
   * 2faSecret: TOTP secret key (Base32)
   * email: Email đăng nhập chính
   * password2: Mật khẩu backup (có thể khác password)
   * email2: Email backup
   */
  parseAccountString(accountString) {
    try {
      // Remove whitespace
      const cleaned = accountString.trim();
      
      // Split by |
      const parts = cleaned.split('|');
      
      if (parts.length < 4) {
        throw new Error('Invalid format: cần ít nhất 4 phần (accountId|password|2faSecret|email)');
      }
      
      const account = {
        accountId: parts[0].trim(),
        password: parts[1].trim(),
        twoFASecret: parts[2].trim(),
        email: parts[3].trim(),
        password2: parts[4] ? parts[4].trim() : parts[1].trim(), // Default = password
        email2: parts[5] ? parts[5].trim() : parts[3].trim(),    // Default = email
      };
      
      // Validate
      if (!account.accountId) {
        throw new Error('Account ID is required');
      }
      
      if (!account.email) {
        throw new Error('Email is required');
      }
      
      if (!account.password) {
        throw new Error('Password is required');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(account.email)) {
        throw new Error(`Invalid email format: ${account.email}`);
      }
      
      // Validate 2FA secret (Base32)
      if (account.twoFASecret) {
        const base32Regex = /^[A-Z2-7]+=*$/;
        if (!base32Regex.test(account.twoFASecret)) {
          this.log(`⚠️ Warning: 2FA secret có thể không hợp lệ (không phải Base32): ${account.twoFASecret}`, 'warning');
        }
      }
      
      return {
        success: true,
        account: account,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * PARSE BATCH STRING (nhiều accounts)
   * Mỗi dòng = 1 account
   */
  parseBatchString(batchString) {
    try {
      // Split by newline
      const lines = batchString
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (lines.length === 0) {
        throw new Error('No accounts found');
      }
      
      const accounts = [];
      const errors = [];
      
      lines.forEach((line, index) => {
        const result = this.parseAccountString(line);
        
        if (result.success) {
          accounts.push(result.account);
        } else {
          errors.push({
            line: index + 1,
            text: line,
            error: result.error,
          });
        }
      });
      
      return {
        success: true,
        accounts: accounts,
        errors: errors,
        total: lines.length,
        valid: accounts.length,
        invalid: errors.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * CHECK nếu account đã có session
   */
  async hasExistingSession(accountId) {
    try {
      const result = await this.sessionManager.restoreSession(accountId);
      return result.success && result.sessionData;
    } catch (error) {
      return false;
    }
  }

  /**
   * LOGIN SINGLE ACCOUNT với 2FA automation
   */
  async loginSingleAccount(account, options = {}) {
    const {
      headless = false,
      useProxy = false,
      skipIfHasSession = true,
    } = options;

    try {
      this.log(`🚀 Đang đăng nhập: ${account.email} (ID: ${account.accountId})`, 'info');
      
      // Check if already has session
      if (skipIfHasSession) {
        const hasSession = await this.hasExistingSession(account.accountId);
        
        if (hasSession) {
          this.log(`✅ Account ${account.accountId} đã có session, bỏ qua đăng nhập`, 'success');
          
          // Create lifecycle profile if not exists
          if (!this.lifecycle.getAccountProfile(account.accountId)) {
            this.lifecycle.createAccountProfile(account.accountId);
          }
          
          return {
            success: true,
            accountId: account.accountId,
            email: account.email,
            skipped: true,
            message: 'Already has session',
          };
        }
      }
      
      // Create lifecycle profile
      if (!this.lifecycle.getAccountProfile(account.accountId)) {
        this.lifecycle.createAccountProfile(account.accountId, {
          accountType: 'regular',
          initialReputation: 0,
        });
        this.log(`📊 Created lifecycle profile for ${account.accountId}`, 'info');
      }
      
      // Setup User Data Directory
      const userDataDir = StealthConfig.createUserDataDir(account.accountId);
      this.log(`💾 User Data Directory: ${userDataDir}`, 'info');
      
      // Get proxy if enabled
      let proxyId = null;
      if (useProxy && this.proxyManager) {
        const proxy = this.proxyManager.getBestProxy(account.accountId, {
          type: 'residential',
        });
        
        if (proxy) {
          proxyId = proxy.id;
          this.proxyManager.assignProxyToAccount(account.accountId, proxyId);
          this.log(`🌐 Assigned proxy: ${proxy.server}`, 'info');
        }
      }
      
      // Nếu có 2FA secret, dùng FacebookWith2FA
      if (account.twoFASecret && account.twoFASecret.length > 10) {
        this.log('🔐 Sử dụng 2FA automation...', 'info');
        
        const fb2FA = new FacebookWith2FA(this.mainWindow);
        
        const result = await fb2FA.loginWith2FA({
          email: account.email,
          password: account.password,
          twoFASecret: account.twoFASecret,
        }, headless, userDataDir);
        
        if (result.success) {
          this.log(`✅ Đăng nhập thành công với 2FA: ${result.userName}`, 'success');
          
          // Capture full session
          this.log('💾 Đang lưu session...', 'info');
          await this.sessionManager.captureFullSession(fb2FA.page, account.accountId);
          
          // Update lifecycle
          this.lifecycle.updateActivity(account.accountId, 'login');
          
          // Close browser
          await fb2FA.close();
          
          return {
            success: true,
            accountId: account.accountId,
            email: account.email,
            userName: result.userName,
            has2FA: true,
          };
        } else {
          throw new Error(result.error || 'Login failed with 2FA');
        }
      } 
      // Không có 2FA, dùng FacebookAdvanced
      else {
        this.log('🔓 Đăng nhập không có 2FA...', 'info');
        
        const fb = new FacebookAdvanced(this.mainWindow, {
          accountId: account.accountId,
          userDataDir: userDataDir,
          proxyManager: this.proxyManager,
          useProxy: useProxy,
          proxyId: proxyId,
        });
        
        const result = await fb.login(account.email, account.password, headless);
        
        if (result.success) {
          this.log(`✅ Đăng nhập thành công: ${result.userName}`, 'success');
          
          // Update lifecycle
          this.lifecycle.updateActivity(account.accountId, 'login');
          
          // Close browser
          await fb.close();
          
          return {
            success: true,
            accountId: account.accountId,
            email: account.email,
            userName: result.userName,
            has2FA: false,
          };
        } else {
          throw new Error(result.error || 'Login failed');
        }
      }
    } catch (error) {
      this.log(`❌ Lỗi đăng nhập ${account.email}: ${error.message}`, 'error');
      
      // Record failure
      if (this.lifecycle.getAccountProfile(account.accountId)) {
        this.lifecycle.recordLoginFailure(account.accountId, error.message);
      }
      
      return {
        success: false,
        accountId: account.accountId,
        email: account.email,
        error: error.message,
      };
    }
  }

  /**
   * LOGIN BATCH ACCOUNTS
   */
  async loginBatch(batchString, options = {}) {
    const {
      headless = true,
      useProxy = false,
      skipIfHasSession = true,
      delayBetweenAccounts = [180000, 300000], // 3-5 PHÚT (QUAN TRỌNG!)
      stopOnError = false,
    } = options;

    try {
      this.log('📋 Parsing batch accounts...', 'info');
      
      // Parse batch string
      const parseResult = this.parseBatchString(batchString);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error);
      }
      
      const { accounts, errors, total, valid, invalid } = parseResult;
      
      this.log(`✅ Parsed ${total} accounts: ${valid} valid, ${invalid} invalid`, 'success');
      
      if (errors.length > 0) {
        this.log('⚠️ Invalid accounts:', 'warning');
        errors.forEach(err => {
          this.log(`  Line ${err.line}: ${err.error}`, 'warning');
        });
      }
      
      if (accounts.length === 0) {
        throw new Error('No valid accounts to login');
      }
      
      // Reset counters
      this.results = [];
      this.successCount = 0;
      this.failedCount = 0;
      
      // Login each account
      this.log(`\n🚀 Bắt đầu đăng nhập ${accounts.length} accounts...\n`, 'info');
      
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        
        this.progress(i + 1, accounts.length, `Đang xử lý account ${i + 1}/${accounts.length}`);
        
        this.log(`\n${'='.repeat(60)}`, 'info');
        this.log(`📱 ACCOUNT ${i + 1}/${accounts.length}`, 'info');
        this.log(`${'='.repeat(60)}`, 'info');
        
        const result = await this.loginSingleAccount(account, {
          headless,
          useProxy,
          skipIfHasSession,
        });
        
        this.results.push(result);
        
        if (result.success) {
          this.successCount++;
          this.log(`\n✅ Thành công: ${result.email} ${result.skipped ? '(skipped - có session)' : ''}`, 'success');
        } else {
          this.failedCount++;
          this.log(`\n❌ Thất bại: ${result.email} - ${result.error}`, 'error');
          
          if (stopOnError) {
            this.log('⚠️ Dừng batch vì stopOnError = true', 'warning');
            break;
          }
        }
        
        // Delay between accounts (trừ account cuối)
        if (i < accounts.length - 1) {
          const delay = delayBetweenAccounts[0] + 
                       Math.random() * (delayBetweenAccounts[1] - delayBetweenAccounts[0]);
          
          this.log(`\n⏳ Chờ ${Math.round(delay / 1000)}s trước khi đăng nhập account tiếp theo...`, 'info');
          await this.sleep(delay);
        }
      }
      
      // Summary
      this.log(`\n${'='.repeat(60)}`, 'info');
      this.log(`🎉 HOÀN THÀNH BATCH LOGIN`, 'success');
      this.log(`${'='.repeat(60)}`, 'info');
      this.log(`✅ Thành công: ${this.successCount}/${accounts.length}`, 'success');
      this.log(`❌ Thất bại: ${this.failedCount}/${accounts.length}`, this.failedCount > 0 ? 'error' : 'info');
      
      return {
        success: true,
        total: accounts.length,
        successCount: this.successCount,
        failedCount: this.failedCount,
        results: this.results,
      };
    } catch (error) {
      this.log(`❌ Lỗi batch login: ${error.message}`, 'error');
      
      return {
        success: false,
        error: error.message,
        results: this.results,
      };
    }
  }

  /**
   * VERIFY ALL SESSIONS (check xem accounts nào còn session)
   */
  async verifyAllSessions(accountIds) {
    this.log('🔍 Kiểm tra sessions...', 'info');
    
    const results = [];
    
    for (const accountId of accountIds) {
      const hasSession = await this.hasExistingSession(accountId);
      const profile = this.lifecycle.getAccountProfile(accountId);
      
      results.push({
        accountId,
        hasSession,
        profile: profile ? {
          age: profile.age,
          reputation: profile.reputation,
          riskScore: profile.riskScore,
          status: profile.health.status,
        } : null,
      });
    }
    
    const withSession = results.filter(r => r.hasSession).length;
    const withoutSession = results.filter(r => !r.hasSession).length;
    
    this.log(`✅ Có session: ${withSession}/${accountIds.length}`, 'success');
    this.log(`❌ Không có session: ${withoutSession}/${accountIds.length}`, withoutSession > 0 ? 'warning' : 'info');
    
    return results;
  }

  /**
   * GET BATCH SUMMARY
   */
  getBatchSummary() {
    return {
      total: this.results.length,
      successCount: this.successCount,
      failedCount: this.failedCount,
      successRate: this.results.length > 0 
        ? (this.successCount / this.results.length * 100).toFixed(1) + '%'
        : '0%',
      results: this.results,
    };
  }

  /**
   * EXPORT RESULTS to file
   */
  exportResults(filePath) {
    const fs = require('fs');
    const summary = this.getBatchSummary();
    
    let output = '='.repeat(60) + '\n';
    output += 'BATCH LOGIN RESULTS\n';
    output += '='.repeat(60) + '\n\n';
    output += `Total: ${summary.total}\n`;
    output += `Success: ${summary.successCount}\n`;
    output += `Failed: ${summary.failedCount}\n`;
    output += `Success Rate: ${summary.successRate}\n\n`;
    output += '='.repeat(60) + '\n';
    output += 'DETAILS\n';
    output += '='.repeat(60) + '\n\n';
    
    this.results.forEach((result, index) => {
      output += `${index + 1}. ${result.email}\n`;
      output += `   Account ID: ${result.accountId}\n`;
      output += `   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
      
      if (result.success) {
        output += `   User Name: ${result.userName || 'N/A'}\n`;
        output += `   Has 2FA: ${result.has2FA ? 'Yes' : 'No'}\n`;
        output += `   Skipped: ${result.skipped ? 'Yes (has session)' : 'No'}\n`;
      } else {
        output += `   Error: ${result.error}\n`;
      }
      
      output += '\n';
    });
    
    fs.writeFileSync(filePath, output, 'utf8');
    this.log(`📄 Exported results to: ${filePath}`, 'success');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BatchLoginManager;

