const { chromium } = require('playwright');
const path = require('path');
const StealthConfig = require('../utils/StealthConfig');
const SessionManager = require('../utils/SessionManager');
const HumanBehavior = require('../utils/HumanBehavior');
const ProxyManager = require('../utils/ProxyManager');
const CaptchaEvasion = require('../utils/CaptchaEvasion');

/**
 * FACEBOOK AUTOMATION - MILITARY GRADE 2025
 * 
 * Tích hợp:
 * - User Data Directory persistent
 * - Advanced anti-detection
 * - Behavioral biometrics simulation
 * - Proxy management với IP-timezone sync
 * - Full session management
 */
class FacebookAdvanced {
  constructor(mainWindow, options = {}) {
    this.mainWindow = mainWindow;
    this.browser = null;
    this.context = null;
    this.page = null;
    
    // Managers
    this.sessionManager = new SessionManager();
    this.proxyManager = options.proxyManager || null;
    
    // Config
    this.accountId = options.accountId || null;
    this.userDataDir = options.userDataDir || null;
    this.useProxy = options.useProxy || false;
    this.proxyId = options.proxyId || null;
  }

  log(message, type = 'info') {
    const logData = {
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    if (type === 'error' || type === 'success') {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('log', logData);
    }
  }

  progress(current, total, message) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('progress', { current, total, message });
    }
  }

  /**
   * ĐĂNG NHẬP với Full Stealth Mode
   */
  async login(email, password, headless = false) {
    try {
      this.log('🚀 Khởi động browser với stealth mode...', 'info');
      
      // Setup user data directory
      if (this.accountId && !this.userDataDir) {
        this.userDataDir = StealthConfig.createUserDataDir(this.accountId);
        this.log(`💾 User data directory: ${this.userDataDir}`, 'info');
      }

      // Get proxy configuration
      let proxyConfig = null;
      let timezone = null;
      let locale = 'en-US';
      
      if (this.useProxy && this.proxyManager && this.proxyId) {
        const proxy = this.proxyManager.assignProxyToAccount(this.accountId, this.proxyId);
        proxyConfig = this.proxyManager.getPlaywrightProxyConfig(this.proxyId);
        timezone = this.proxyManager.getTimezoneFromProxy(this.proxyId);
        locale = this.proxyManager.getLocaleFromProxy(this.proxyId);
        
        this.log(`🌐 Using proxy: ${proxy.server} (${proxy.country || 'unknown'})`, 'info');
        this.log(`🕐 Timezone: ${timezone}`, 'info');
      }

      // Get stealth configuration
      const stealthConfig = StealthConfig.getStealthConfig({
        userDataDir: this.userDataDir,
        proxy: proxyConfig,
        timezone: timezone,
        locale: locale,
      });

      // Launch browser với persistent context
      if (this.userDataDir) {
        this.log('📂 Sử dụng Persistent Context (như Chrome profile thật)...', 'info');
        
        this.context = await chromium.launchPersistentContext(this.userDataDir, {
          headless: headless,
          ...stealthConfig.contextOptions,
          proxy: proxyConfig,
          args: stealthConfig.args,
        });
        
        this.page = this.context.pages()[0] || await this.context.newPage();
      } else {
        // Normal browser
        this.browser = await chromium.launch({
          headless: headless,
          args: stealthConfig.args,
        });

        this.context = await this.browser.newContext({
          ...stealthConfig.contextOptions,
          proxy: proxyConfig,
        });

        this.page = await this.context.newPage();
      }

      // Inject stealth scripts
      this.log('💉 Injecting stealth scripts...', 'info');
      await StealthConfig.injectStealthScripts(this.page);
      
      // WebRTC leak prevention
      if (this.useProxy) {
        await this.page.addInitScript(ProxyManager.getWebRTCBlockScript());
      }

      // Inject captcha bypass scripts
      this.log('🛡️ Injecting captcha evasion...', 'info');
      await this.page.addInitScript(CaptchaEvasion.getCaptchaBypassScripts());

      // Add anti-captcha headers
      await this.page.setExtraHTTPHeaders(CaptchaEvasion.getAntiCaptchaHeaders());

      // Warmup session để tránh captcha
      this.log('🔥 Warming up session...', 'info');
      await CaptchaEvasion.warmupSession(this.page);

      // Truy cập Facebook
      this.log('🌐 Đang truy cập Facebook...', 'info');
      await this.page.goto('https://www.facebook.com/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      // Human behavior: Read page a bit
      await HumanBehavior.humanDelay(2000, 4000);

      // Check for captcha
      const captchaCheck = await CaptchaEvasion.detectCaptcha(this.page);
      if (captchaCheck.detected) {
        this.log('⚠️ Captcha phát hiện! Đang xử lý...', 'warning');
        const handled = await CaptchaEvasion.handleCaptcha(this.page, {
          autoClick: true,
          waitForManual: !headless, // Chỉ wait manual nếu visible
          timeout: 120000,
        });
        
        if (!handled.success) {
          throw new Error('Cannot bypass captcha: ' + handled.error);
        }
        
        this.log('✅ Captcha đã được xử lý!', 'success');
      }

      // Check if already logged in
      const alreadyLoggedIn = await this.checkLoginSuccess();
      if (alreadyLoggedIn) {
        this.log('✅ Đã đăng nhập từ session cũ!', 'success');
        
        const userName = await this.getUserName();
        
        // Capture và save session
        await this.sessionManager.captureFullSession(this.page, this.accountId);
        
        return {
          success: true,
          message: 'Đã đăng nhập từ session',
          userName: userName,
        };
      }

      // Điền thông tin đăng nhập - HUMAN-LIKE
      this.log('📝 Điền thông tin đăng nhập...', 'info');
      
      await HumanBehavior.humanType(this.page, 'input[name="email"]', email, {
        minDelay: 80,
        maxDelay: 200,
        typoChance: 0.02,
      });
      
      await HumanBehavior.humanDelay(500, 1000);
      
      await HumanBehavior.humanType(this.page, 'input[name="pass"]', password, {
        minDelay: 70,
        maxDelay: 180,
        typoChance: 0.03,
      });

      // Human pause before clicking login
      await HumanBehavior.humanDelay(800, 1500);

      // Click login button - HUMAN-LIKE
      this.log('🔐 Đăng nhập...', 'info');
      await HumanBehavior.humanClick(this.page, 'button[name="login"]', {
        moveToElement: true,
        reactionTime: true,
      });

      // Wait for login with human-like checking
      let loginSuccess = false;
      let secondLoginAttempted = false;
      const startTime = Date.now();
      const maxWaitTime = 60000;
      
      while (!loginSuccess && (Date.now() - startTime) < maxWaitTime) {
        await HumanBehavior.humanDelay(1000, 2000);
        
        // Check login success
        if (await this.checkLoginSuccess()) {
          loginSuccess = true;
          break;
        }
        
        // Check for captcha và xử lý
        const captchaCheck = await CaptchaEvasion.detectCaptcha(this.page);
        if (captchaCheck.detected) {
          this.log('⚠️ Captcha phát hiện trong login! Đang xử lý...', 'warning');
          
          const handled = await CaptchaEvasion.handleCaptcha(this.page, {
            autoClick: true,
            waitForManual: !headless,
            timeout: 120000,
          });
          
          if (handled.success) {
            this.log('✅ Captcha đã xử lý xong, tiếp tục login...', 'success');
            await HumanBehavior.humanDelay(2000, 4000);
          }
        }
        
        // Check if need second login (after captcha)
        const hasLoginForm = await this.page.locator('input[name="email"]').count();
        if (hasLoginForm > 0 && !secondLoginAttempted) {
          const elapsed = Date.now() - startTime;
          if (elapsed > 5000) {
            this.log('🔄 Cần đăng nhập lại...', 'info');
            
            try {
              const emailVal = await this.page.locator('input[name="email"]').inputValue();
              if (!emailVal) {
                await HumanBehavior.humanType(this.page, 'input[name="email"]', email);
              }
              
              const passVal = await this.page.locator('input[name="pass"]').inputValue();
              if (!passVal) {
                await HumanBehavior.humanType(this.page, 'input[name="pass"]', password);
              }
              
              await HumanBehavior.humanClick(this.page, 'button[name="login"]');
              secondLoginAttempted = true;
            } catch (e) {
              // Continue
            }
          }
        }
      }
      
      if (loginSuccess) {
        this.log('🎉 Đăng nhập thành công!', 'success');
        
        // Record proxy success
        if (this.useProxy && this.proxyManager && this.proxyId) {
          this.proxyManager.recordProxySuccess(this.proxyId);
        }
        
        // Human behavior: Explore page a bit
        await HumanBehavior.explorePageRandomly(this.page, {
          actions: 3,
        });
        
        // Get user name
        const userName = await this.getUserName();
        
        // Capture và save full session
        this.log('💾 Lưu session...', 'info');
        await this.sessionManager.captureFullSession(this.page, this.accountId);
        
        return {
          success: true,
          message: 'Đăng nhập thành công',
          userName: userName,
        };
      } else {
        throw new Error('Hết thời gian chờ đăng nhập');
      }
    } catch (error) {
      this.log(`❌ Lỗi đăng nhập: ${error.message}`, 'error');
      
      // Record proxy failure
      if (this.useProxy && this.proxyManager && this.proxyId) {
        this.proxyManager.recordProxyFailure(this.proxyId);
      }
      
      await this.close();
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ĐĂNG NHẬP từ saved session
   */
  async loginWithSession(headless = false) {
    try {
      this.log('🔄 Đăng nhập từ session đã lưu...', 'info');
      
      // Restore session
      const sessionResult = await this.sessionManager.restoreSession(this.accountId);
      if (!sessionResult.success) {
        throw new Error('Không tìm thấy session');
      }
      
      const sessionData = sessionResult.sessionData;

      // Setup user data directory
      if (!this.userDataDir) {
        this.userDataDir = StealthConfig.createUserDataDir(this.accountId);
      }

      // Get proxy configuration
      let proxyConfig = null;
      let timezone = null;
      let locale = 'en-US';
      
      if (this.useProxy && this.proxyManager && this.proxyId) {
        const proxy = this.proxyManager.assignProxyToAccount(this.accountId, this.proxyId);
        proxyConfig = this.proxyManager.getPlaywrightProxyConfig(this.proxyId);
        timezone = this.proxyManager.getTimezoneFromProxy(this.proxyId);
        locale = this.proxyManager.getLocaleFromProxy(this.proxyId);
      }

      // Get stealth configuration
      const stealthConfig = StealthConfig.getStealthConfig({
        userDataDir: this.userDataDir,
        proxy: proxyConfig,
        timezone: timezone,
        locale: locale,
      });

      // Launch browser
      if (this.userDataDir) {
        this.context = await chromium.launchPersistentContext(this.userDataDir, {
          headless: headless,
          ...stealthConfig.contextOptions,
          proxy: proxyConfig,
          args: stealthConfig.args,
          storageState: sessionData.storageState, // Restore cookies & localStorage
        });
        
        this.page = this.context.pages()[0] || await this.context.newPage();
      } else {
        this.browser = await chromium.launch({
          headless: headless,
          args: stealthConfig.args,
        });

        this.context = await this.browser.newContext({
          ...stealthConfig.contextOptions,
          proxy: proxyConfig,
          storageState: sessionData.storageState,
        });

        this.page = await this.context.newPage();
      }

      // Inject stealth scripts
      await StealthConfig.injectStealthScripts(this.page);
      
      // Inject session data
      await this.sessionManager.injectSessionIntoPage(this.page, sessionData);

      // Truy cập Facebook
      this.log('🌐 Xác minh session...', 'info');
      await this.page.goto('https://www.facebook.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      await HumanBehavior.humanDelay(2000, 4000);

      // Check if logged in
      const isLoggedIn = await this.checkLoginSuccess();

      if (isLoggedIn) {
        this.log('✅ Đăng nhập thành công từ session!', 'success');
        
        const userName = await this.getUserName();
        
        return {
          success: true,
          message: 'Đăng nhập từ session thành công',
          userName: userName,
        };
      } else {
        this.log('❌ Session đã hết hạn', 'error');
        await this.close();
        
        return {
          success: false,
          error: 'Session đã hết hạn, vui lòng đăng nhập lại',
        };
      }
    } catch (error) {
      this.log(`❌ Lỗi đăng nhập từ session: ${error.message}`, 'error');
      await this.close();
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if logged in
   */
  async checkLoginSuccess() {
    try {
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('/login')) return false;
      
      const hasLoginForm = await this.page.locator('input[name="email"]').count();
      if (hasLoginForm > 0) return false;
      
      const hasFacebookElements = await this.page.evaluate(() => {
        return document.querySelector('[role="feed"]') !== null ||
               document.querySelector('[role="main"]') !== null ||
               document.querySelector('a[href*="/profile.php"]') !== null;
      });
      
      return hasFacebookElements;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get user name
   */
  async getUserName() {
    try {
      this.log('📛 Lấy tên người dùng...', 'info');
      
      await this.page.goto('https://www.facebook.com/me', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await HumanBehavior.humanDelay(2000, 4000);
      
      const profileName = await this.page.evaluate(() => {
        const h1Elements = document.querySelectorAll('h1');
        for (const h1 of h1Elements) {
          const text = h1.textContent.trim();
          
          if (!text || text.length < 2) continue;
          
          const forbidden = [
            'facebook', 'profile', 'trang cá nhân', 'home'
          ];
          
          const textLower = text.toLowerCase();
          const isForbidden = forbidden.some(f => textLower.includes(f));
          
          if (!isForbidden && text.length >= 2 && text.length <= 100) {
            return text;
          }
        }
        
        if (document.title) {
          const titleParts = document.title.split('|');
          const possibleName = titleParts[0].trim();
          
          if (possibleName && 
              !possibleName.toLowerCase().startsWith('facebook') &&
              possibleName.length >= 2) {
            return possibleName;
          }
        }
        
        return null;
      });
      
      if (profileName) {
        this.log(`✅ Tên: ${profileName}`, 'success');
        
        await this.page.goto('https://www.facebook.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        return profileName;
      }
      
      return 'Người dùng';
    } catch (error) {
      this.log(`⚠️ Không lấy được tên người dùng: ${error.message}`, 'warning');
      return 'Người dùng';
    }
  }

  /**
   * Get fanpages với human behavior
   */
  async getFanpages() {
    try {
      this.log('📄 Lấy danh sách Fanpage...', 'info');
      
      await this.page.goto('https://www.facebook.com/pages/?category=your_pages', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      
      await HumanBehavior.humanDelay(2000, 3000);
      
      // Scroll với human behavior
      await HumanBehavior.humanScroll(this.page, {
        distance: 500,
        pauseChance: 0.3,
      });
      
      await HumanBehavior.humanDelay(1000, 2000);
      
      const pages = await this.page.evaluate(() => {
        const pagesData = [];
        const seen = new Set();
        
        const allLinks = document.querySelectorAll('a[href]');
        
        allLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (!href) return;
          
          const isValidLink = href.includes('/profile.php?id=') || 
                             href.match(/^\/[a-zA-Z0-9._-]{3,50}\/?$/);
          
          if (isValidLink && 
              !href.includes('/pages') && 
              !href.includes('/login')) {
            
            let name = link.textContent.trim();
            
            if (name.length > 100) {
              const shortEl = link.querySelector('span, strong, h2, h3');
              if (shortEl) name = shortEl.textContent.trim();
            }
            
            if (name && 
                name.length > 2 && 
                name.length < 80 && 
                !name.includes('http')) {
              
              const key = `${name}-${href}`;
              if (!seen.has(key)) {
                seen.add(key);
                
                let pageId = href;
                if (href.includes('profile.php?id=')) {
                  const match = href.match(/id=(\d+)/);
                  if (match) pageId = match[1];
                } else {
                  const match = href.match(/^\/([^\/]+)/);
                  if (match) pageId = match[1];
                }
                
                pagesData.push({
                  id: pageId,
                  name: name,
                  url: href.startsWith('http') ? href : `https://www.facebook.com${href}`
                });
              }
            }
          }
        });
        
        return pagesData;
      });
      
      const uniquePages = [];
      const seenNames = new Set();
      
      pages.forEach(page => {
        if (!seenNames.has(page.name)) {
          seenNames.add(page.name);
          uniquePages.push(page);
        }
      });
      
      this.log(`✅ Tìm thấy ${uniquePages.length} Fanpage`, 'success');
      
      return uniquePages;
    } catch (error) {
      this.log(`❌ Lỗi lấy danh sách Fanpage: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Close browser
   */
  async close() {
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.context && !this.userDataDir) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
      
      this.log('🔒 Đã đóng browser', 'info');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}

module.exports = FacebookAdvanced;

