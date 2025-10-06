const { chromium } = require('playwright');
const TwoFactorAuth = require('../utils/TwoFactorAuth');
const StealthConfig = require('../utils/StealthConfig');
const HumanBehavior = require('../utils/HumanBehavior');
const CaptchaEvasion = require('../utils/CaptchaEvasion');

/**
 * Facebook Automation với hỗ trợ 2FA tự động
 */
class FacebookWith2FA {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  log(message, type = 'info') {
    const logData = { message, type, timestamp: new Date().toISOString() };
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
   * Đăng nhập Facebook với 2FA tự động
   * @param {Object} credentials - { email, password, twoFASecret }
   * @param {boolean} headless - Chạy ẩn hay hiện browser
   * @param {string} userDataDir - Thư mục lưu profile (persistent context)
   */
  async loginWith2FA(credentials, headless = false, userDataDir = null) {
    try {
      const { email, password, twoFASecret } = credentials;

      this.log('🚀 Bắt đầu đăng nhập tự động với 2FA...', 'info');
      this.log(`📧 Email: ${email}`, 'info');

      // Get FULL stealth config
      const stealthConfig = StealthConfig.getStealthConfig({
        userDataDir: userDataDir,
      });

      // Nếu có userDataDir, dùng persistent context (giống Chrome profile)
      if (userDataDir) {
        this.log(`💾 Sử dụng persistent context: ${userDataDir}`, 'info');
        
        this.context = await chromium.launchPersistentContext(userDataDir, {
          headless: headless,
          ...stealthConfig.contextOptions,
          args: stealthConfig.args,
        });
        
        // Persistent context tự động có page
        this.page = this.context.pages()[0] || await this.context.newPage();
        this.browser = null; // Không có browser object riêng
        
      } else {
        // Cách cũ: browser thường
        this.browser = await chromium.launch({
          headless: headless,
          args: stealthConfig.args,
        });

        this.context = await this.browser.newContext({
          ...stealthConfig.contextOptions,
        });

        this.page = await this.context.newPage();
      }

      // CRITICAL: Inject ALL stealth scripts
      this.log('💉 Injecting ULTRA stealth scripts...', 'info');
      await StealthConfig.injectStealthScripts(this.page);
      
      // Inject captcha evasion
      await this.page.addInitScript(CaptchaEvasion.getCaptchaBypassScripts());
      
      // Set anti-captcha headers
      await this.page.setExtraHTTPHeaders(CaptchaEvasion.getAntiCaptchaHeaders());

      // BƯỚC 1: Warmup session để tránh captcha
      this.log('🔥 Warming up session...', 'info');
      await CaptchaEvasion.warmupSession(this.page);
      
      // Truy cập Facebook
      this.log('🌐 Đang truy cập Facebook...', 'info');
      await this.page.goto('https://www.facebook.com/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      // HUMAN BEHAVIOR: Đọc trang trước khi login
      await HumanBehavior.humanDelay(3000, 5000);
      await HumanBehavior.humanScroll(this.page, { distance: 200 });
      await HumanBehavior.humanDelay(2000, 3000);

      // Check captcha TRƯỚC KHI login
      let captchaCheck = await CaptchaEvasion.detectCaptcha(this.page);
      if (captchaCheck.detected) {
        this.log('⚠️ Captcha phát hiện trước login! Đang xử lý...', 'warning');
        const handled = await CaptchaEvasion.handleCaptcha(this.page, {
          autoClick: true,
          waitForManual: !headless,
          timeout: 120000,
        });
        if (!handled.success) {
          throw new Error('Cannot bypass captcha before login');
        }
      }

      // BƯỚC 2: Điền email & password với HUMAN BEHAVIOR
      this.log('📝 Điền thông tin đăng nhập...', 'info');
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      
      // Human-like typing
      await HumanBehavior.humanType(this.page, 'input[name="email"]', email, {
        minDelay: 80,
        maxDelay: 200,
        typoChance: 0.02,
      });
      
      await HumanBehavior.humanDelay(1000, 2000);
      
      await HumanBehavior.humanType(this.page, 'input[name="pass"]', password, {
        minDelay: 70,
        maxDelay: 180,
        typoChance: 0.03,
      });

      // Human pause trước khi click
      await HumanBehavior.humanDelay(1500, 3000);

      // BƯỚC 3: Click đăng nhập với HUMAN BEHAVIOR
      this.log('🔐 Nhấn đăng nhập...', 'info');
      await HumanBehavior.humanClick(this.page, 'button[name="login"]', {
        moveToElement: true,
        reactionTime: true,
      });
      
      // Đợi lâu hơn sau khi click
      await HumanBehavior.humanDelay(4000, 6000);

      // BƯỚC 4: Kiểm tra và xử lý 2FA
      const needsTwoFA = await this.detect2FAPage();

      if (needsTwoFA) {
        this.log('🔢 Phát hiện yêu cầu 2FA...', 'info');
        
        // Check captcha TRƯỚC KHI xử lý 2FA
        captchaCheck = await CaptchaEvasion.detectCaptcha(this.page);
        if (captchaCheck.detected) {
          this.log('⚠️ Captcha phát hiện ở trang 2FA! Đang xử lý...', 'warning');
          const handled = await CaptchaEvasion.handleCaptcha(this.page, {
            autoClick: true,
            waitForManual: !headless,
            timeout: 120000,
          });
          if (!handled.success) {
            throw new Error('Cannot bypass captcha at 2FA page');
          }
          await HumanBehavior.humanDelay(3000, 5000);
        }
        
        // Human delay trước khi click
        await HumanBehavior.humanDelay(2000, 4000);
        
        // Click "Thử cách khác" nếu có
        const clickedTryCach = await this.clickTryCachKhac();
        if (clickedTryCach) {
          await HumanBehavior.humanDelay(2000, 3000);
          
          // Chọn "Ứng dụng xác thực"
          const clickedUngDung = await this.clickUngDungXacThuc();
          if (clickedUngDung) {
            await HumanBehavior.humanDelay(2000, 3000);
            
            // Click "Tiếp tục"
            await this.clickTiepTuc();
            await HumanBehavior.humanDelay(2000, 3000);
          }
        }
        
        // Human delay trước khi generate TOTP
        await HumanBehavior.humanDelay(1000, 2000);
        
        // Tạo mã TOTP
        const totpCode = TwoFactorAuth.generateTOTP(twoFASecret);
        const timeRemaining = TwoFactorAuth.getTimeRemaining();
        
        this.log(`🔑 Mã 2FA: ${totpCode} (còn ${timeRemaining}s)`, 'success');

        // Human delay trước khi điền
        await HumanBehavior.humanDelay(1000, 2000);

        // Điền mã 2FA
        const filled = await this.fill2FACode(totpCode);
        
        if (!filled) {
          throw new Error('Không thể điền mã 2FA');
        }

        this.log('✅ Đã điền mã 2FA, đang chờ xác thực...', 'info');
        await HumanBehavior.humanDelay(5000, 8000);
      }

      // BƯỚC 5: Xử lý popup "Lưu thông tin đăng nhập"
      this.log('🔍 Kiểm tra popup "Lưu thông tin"...', 'info');
      await HumanBehavior.humanDelay(2000, 3000);
      await this.clickLuuThongTin();
      
      // BƯỚC 6: Xử lý "Tin cậy thiết bị này"
      this.log('🔍 Kiểm tra "Tin cậy thiết bị này"...', 'info');
      await HumanBehavior.humanDelay(2000, 3000);
      await this.clickTinCayThietBi();
      
      // BƯỚC 7: Đợi page load hoàn toàn
      await HumanBehavior.humanDelay(3000, 5000);
      
      // BƯỚC 8: Kiểm tra đăng nhập thành công
      const loginSuccess = await this.checkLoginSuccess();

      if (loginSuccess) {
        this.log('✅ Đăng nhập 2FA thành công!', 'success');
        
        // Lấy tên user
        const userName = await this.getUserName();
        
        this.log(`🎉 Hoàn tất đăng nhập: ${userName}`, 'success');

        // Lấy session
        const sessionData = await this.getSessionData();

        return {
          success: true,
          userName: userName,
          sessionData: sessionData,
          email: email
        };
      } else {
        throw new Error('Đăng nhập thất bại sau khi nhập 2FA');
      }

    } catch (error) {
      this.log(`❌ Lỗi đăng nhập: ${error.message}`, 'error');
      
      // Close browser nếu lỗi
      if (this.browser) {
        await this.browser.close().catch(() => {});
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Phát hiện trang yêu cầu 2FA
   */
  async detect2FAPage() {
    try {
      const url = this.page.url();
      
      // Check URL
      if (url.includes('/checkpoint/') || 
          url.includes('/two_factor/') ||
          url.includes('approvals_code')) {
        return true;
      }

      // Check input 2FA
      const has2FAInput = await this.page.evaluate(() => {
        // Tìm input code
        const inputs = document.querySelectorAll('input[type="text"], input[type="tel"]');
        
        for (const input of inputs) {
          const label = input.getAttribute('aria-label') || input.getAttribute('placeholder') || '';
          const name = input.getAttribute('name') || '';
          
          // Facebook dùng nhiều tên khác nhau cho input 2FA
          if (label.toLowerCase().includes('code') ||
              label.toLowerCase().includes('mã') ||
              name.includes('approvals_code') ||
              name.includes('code')) {
            return true;
          }
        }
        
        return false;
      });

      return has2FAInput;
    } catch (error) {
      return false;
    }
  }

  /**
   * Điền mã 2FA vào form - IMPROVED VERSION
   */
  async fill2FACode(code) {
    try {
      this.log(`🔍 Đang tìm ô nhập mã 2FA...`, 'info');
      
      // Đợi page load sau khi click "Tiếp tục"
      await this.page.waitForTimeout(2000);
      
      // Chiến lược 1: Tìm input bằng name="approvals_code"
      const approvalInputCount = await this.page.locator('input[name="approvals_code"]').count();
      if (approvalInputCount > 0) {
        this.log(`✓ Tìm thấy input[name="approvals_code"]`, 'info');
        const approvalInput = await this.page.locator('input[name="approvals_code"]').first();
        
        // Human-like typing
        await HumanBehavior.humanType(this.page, 'input[name="approvals_code"]', code, {
          minDelay: 100,
          maxDelay: 200,
        });
        
        await HumanBehavior.humanDelay(1000, 2000);
        
        // Click submit
        await this.clickSubmitButton();
        return true;
      }

      // Chiến lược 2: Tìm bất kỳ input text nào visible
      this.log(`🔍 Tìm input text visible...`, 'info');
      const allInputs = await this.page.locator('input[type="text"], input[type="tel"], input[type="number"]').all();
      
      for (const input of allInputs) {
        const isVisible = await input.isVisible();
        if (isVisible) {
          this.log(`✓ Tìm thấy input visible, đang điền mã...`, 'info');
          
          // Click vào input
          await input.click();
          await HumanBehavior.humanDelay(500, 1000);
          
          // Type code human-like
          await input.pressSequentially(code, { delay: 150 });
          
          await HumanBehavior.humanDelay(1000, 2000);
          
          // Click submit
          await this.clickSubmitButton();
          return true;
        }
      }

      // Chiến lược 3: Tìm bằng evaluate (last resort)
      this.log(`🔍 Tìm input bằng evaluate...`, 'info');
      const filled = await this.page.evaluate((code) => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="number"], input:not([type])');
        
        for (const input of inputs) {
          // Check if visible
          const style = window.getComputedStyle(input);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          
          const label = (input.getAttribute('aria-label') || '').toLowerCase();
          const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
          const name = (input.getAttribute('name') || '').toLowerCase();
          const id = (input.getAttribute('id') || '').toLowerCase();
          
          // Check if this is 2FA input
          if (label.includes('code') || 
              label.includes('mã') ||
              placeholder.includes('code') ||
              placeholder.includes('mã') ||
              placeholder.includes('6') ||
              name.includes('code') ||
              id.includes('code')) {
            
            console.log('✓ Found 2FA input:', input);
            
            // Focus and fill
            input.focus();
            input.value = code;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            
            return true;
          }
        }
        
        // Fallback: Fill first visible input
        for (const input of inputs) {
          const style = window.getComputedStyle(input);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            console.log('⚠️ Fallback: Filling first visible input');
            input.focus();
            input.value = code;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        
        return false;
      }, code);

      if (filled) {
        this.log(`✓ Đã điền mã bằng evaluate`, 'info');
        await this.page.waitForTimeout(1000);
        await this.clickSubmitButton();
        return true;
      }

      this.log(`❌ Không tìm thấy ô nhập mã 2FA`, 'error');
      return false;
    } catch (error) {
      this.log(`❌ Lỗi điền 2FA: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Click nút submit sau khi điền 2FA
   */
  async clickSubmitButton() {
    try {
      // Tìm nút "Tiếp tục" / "Continue" / "Submit"
      const clicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          
          if (text.includes('tiếp tục') ||
              text.includes('continue') ||
              text.includes('submit') ||
              text.includes('xác nhận') ||
              text.includes('confirm')) {
            
            btn.click();
            return true;
          }
        }
        
        return false;
      });

      if (!clicked) {
        // Fallback: Nhấn Enter
        await this.page.keyboard.press('Enter');
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Kiểm tra đăng nhập thành công
   */
  async checkLoginSuccess() {
    try {
      // Đợi tối đa 15 giây
      for (let i = 0; i < 30; i++) {
        await this.page.waitForTimeout(500);
        
        const url = this.page.url();
        
        // Check URL không phải login/checkpoint
        if (!url.includes('/login') && 
            !url.includes('/checkpoint/') &&
            !url.includes('/two_factor/')) {
          
          // Check có elements của Facebook
          const hasElements = await this.page.evaluate(() => {
            return document.querySelector('[role="feed"]') !== null ||
                   document.querySelector('[role="main"]') !== null ||
                   document.querySelector('a[href*="/profile.php"]') !== null;
          });
          
          if (hasElements) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Lấy tên người dùng - IMPROVED
   */
  async getUserName() {
    try {
      this.log('📛 Đang lấy tên người dùng...', 'info');
      
      // Method 1: Đi đến profile page
      try {
        await this.page.goto('https://www.facebook.com/me', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await this.page.waitForTimeout(3000);
        
        const profileName = await this.page.evaluate(() => {
          // Tìm h1 đầu tiên (tên profile)
          const h1Elements = document.querySelectorAll('h1');
          for (const h1 of h1Elements) {
            const text = h1.textContent.trim();
            
            if (!text || text.length < 2) continue;
            
            const forbidden = [
              'facebook', 'profile', 'trang cá nhân', 'home', 'đoạn chat',
              'chats', 'messages', 'messenger', 'bạn bè', 'friends', 'video',
              'watch', 'marketplace', 'groups', 'pages', 'notifications'
            ];
            
            const textLower = text.toLowerCase();
            const isForbidden = forbidden.some(f => textLower.includes(f));
            
            if (!isForbidden && text.length >= 2 && text.length <= 100) {
              console.log(`✓ Tìm thấy tên từ h1: ${text}`);
              return text;
            }
          }
          
          // Tìm từ document.title
          if (document.title) {
            const titleParts = document.title.split('|');
            const possibleName = titleParts[0].trim();
            
            if (possibleName && 
                !possibleName.toLowerCase().startsWith('facebook') &&
                possibleName.length >= 2 &&
                possibleName.length <= 100) {
              console.log(`✓ Tìm thấy tên từ title: ${possibleName}`);
              return possibleName;
            }
          }
          
          // Tìm từ meta og:title
          const metaTitle = document.querySelector('meta[property="og:title"]');
          if (metaTitle) {
            const content = metaTitle.getAttribute('content');
            if (content && 
                !content.toLowerCase().startsWith('facebook') &&
                content.length >= 2 &&
                content.length <= 100) {
              console.log(`✓ Tìm thấy tên từ meta: ${content}`);
              return content;
            }
          }
          
          return null;
        });
        
        if (profileName) {
          this.log(`✅ Lấy được tên: ${profileName}`, 'success');
          
          // Quay về trang chủ
          await this.page.goto('https://www.facebook.com/', { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
          });
          
          return profileName;
        }
      } catch (error) {
        this.log(`⚠️ Lỗi lấy tên từ profile: ${error.message}`, 'warning');
      }
      
      // Method 2: Lấy từ current page
      const userName = await this.page.evaluate(() => {
        // Tìm tên trong profile link
        const profileLink = document.querySelector('a[href*="/profile.php"]');
        if (profileLink) {
          const ariaLabel = profileLink.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.length > 0 && ariaLabel.length < 100) {
            return ariaLabel;
          }
        }
        
        // Tìm trong menu
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        for (const item of menuItems) {
          const text = item.textContent.trim();
          if (text && text.length > 2 && text.length < 50) {
            const firstLine = text.split('\n')[0].trim();
            if (firstLine && firstLine.length > 2) {
              return firstLine;
            }
          }
        }
        
        // Tìm span có tên
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          const parent = span.parentElement;
          
          if (text && text.length >= 2 && text.length <= 50 &&
              parent && parent.tagName === 'A' &&
              parent.href && parent.href.includes('/profile.php')) {
            return text;
          }
        }
        
        return null;
      });
      
      if (userName) {
        this.log(`✅ Lấy được tên: ${userName}`, 'success');
        return userName;
      }
      
      this.log('⚠️ Không lấy được tên người dùng - dùng tên mặc định', 'warning');
      return 'Người dùng';
    } catch (error) {
      this.log(`❌ Lỗi lấy tên người dùng: ${error.message}`, 'error');
      return 'Người dùng';
    }
  }

  /**
   * Lấy session data để lưu
   */
  async getSessionData() {
    try {
      const sessionState = await this.context.storageState();
      return sessionState;
    } catch (error) {
      return null;
    }
  }

  /**
   * Lấy session state hiện tại
   */
  async getSessionState() {
    try {
      if (this.context) {
        return await this.context.storageState();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Click "Thử cách khác"
   */
  async clickTryCachKhac() {
    try {
      const clicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('div[role="button"], button, a');
        
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          
          if (text.includes('Thử cách khác') || 
              text.includes('Try another way') ||
              text.includes('Try other ways')) {
            btn.click();
            console.log('✓ Clicked Thử cách khác');
            return true;
          }
        }
        
        return false;
      });
      
      return clicked;
    } catch (error) {
      return false;
    }
  }

  /**
   * Click "Ứng dụng xác thực" - IMPROVED
   */
  async clickUngDungXacThuc() {
    try {
      this.log('🔍 Tìm và click "Ứng dụng xác thực"...', 'info');
      
      // Đợi một chút để page load
      await this.page.waitForTimeout(1500);
      
      // Method 1: Tìm bằng Playwright locator
      const radioLabels = await this.page.locator('div[role="radio"], label, div[tabindex="0"]').all();
      
      for (const label of radioLabels) {
        const text = await label.textContent();
        if (text && (text.includes('Ứng dụng xác thực') || 
                     text.includes('Authentication app') ||
                     text.includes('xác thực'))) {
          
          this.log('✓ Tìm thấy element "Ứng dụng xác thực"', 'info');
          
          // Human-like click
          await label.scrollIntoViewIfNeeded();
          await HumanBehavior.humanDelay(500, 1000);
          await label.click();
          
          this.log('✅ Đã click "Ứng dụng xác thực"', 'success');
          return true;
        }
      }
      
      // Method 2: Evaluate and click
      const clicked = await this.page.evaluate(() => {
        // Tìm tất cả elements
        const allElements = document.querySelectorAll('div, span, label, input');
        
        for (const el of allElements) {
          const text = el.textContent || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          
          if (text.includes('Ứng dụng xác thực') || 
              text.includes('Authentication app') ||
              ariaLabel.includes('Authentication app') ||
              text.includes('xác thực')) {
            
            // Tìm clickable parent
            let clickable = el;
            
            // Check nếu là radio input
            if (el.tagName === 'INPUT' && el.type === 'radio') {
              clickable = el;
            } else {
              // Tìm radio trong children
              const radio = el.querySelector('input[type="radio"]');
              if (radio) {
                clickable = radio;
              } else {
                // Tìm clickable parent
                clickable = el.closest('div[role="radio"]') ||
                           el.closest('label') ||
                           el.closest('div[tabindex="0"]') ||
                           el;
              }
            }
            
            // Click
            clickable.scrollIntoView({ block: 'center' });
            clickable.click();
            
            console.log('✓ Clicked Ứng dụng xác thực');
            return true;
          }
        }
        
        return false;
      });
      
      if (clicked) {
        this.log('✅ Đã click "Ứng dụng xác thực" (evaluate)', 'success');
        return true;
      }
      
      this.log('⚠️ Không tìm thấy "Ứng dụng xác thực"', 'warning');
      return false;
    } catch (error) {
      this.log(`❌ Lỗi click "Ứng dụng xác thực": ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Click "Tiếp tục" - IMPROVED
   */
  async clickTiepTuc() {
    try {
      this.log('🔍 Tìm và click "Tiếp tục"...', 'info');
      
      // Đợi button xuất hiện
      await this.page.waitForTimeout(1500);
      
      // Method 1: Tìm bằng Playwright locator
      const buttons = await this.page.locator('button, div[role="button"], [role="button"]').all();
      
      for (const button of buttons) {
        try {
          const text = await button.textContent();
          const isVisible = await button.isVisible();
          
          if (isVisible && text && (text.trim() === 'Tiếp tục' || 
                                     text.trim() === 'Continue' ||
                                     text.includes('Tiếp tục') ||
                                     text.includes('Continue'))) {
            
            this.log('✓ Tìm thấy nút "Tiếp tục"', 'info');
            
            // Human-like click
            await button.scrollIntoViewIfNeeded();
            await HumanBehavior.humanDelay(500, 1000);
            await button.click();
            
            this.log('✅ Đã click "Tiếp tục"', 'success');
            return true;
          }
        } catch (e) {
          // Skip this button
          continue;
        }
      }
      
      // Method 2: Evaluate and click
      const clicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, div[role="button"], [role="button"], a');
        
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          const ariaLabel = btn.getAttribute('aria-label') || '';
          
          // Check visibility
          const style = window.getComputedStyle(btn);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          
          if (text === 'Tiếp tục' || 
              text === 'Continue' ||
              text === 'Tiếp' ||
              text.includes('Tiếp tục') ||
              ariaLabel.includes('Continue') ||
              ariaLabel.includes('Tiếp tục')) {
            
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            
            console.log('✓ Clicked Tiếp tục');
            return true;
          }
        }
        
        return false;
      });
      
      if (clicked) {
        this.log('✅ Đã click "Tiếp tục" (evaluate)', 'success');
        return true;
      }
      
      this.log('⚠️ Không tìm thấy nút "Tiếp tục"', 'warning');
      return false;
    } catch (error) {
      this.log(`❌ Lỗi click "Tiếp tục": ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Click "Lưu" (lưu thông tin đăng nhập)
   */
  async clickLuuThongTin() {
    try {
      this.log('🔍 Tìm nút "Lưu" thông tin đăng nhập...', 'info');
      
      // Đợi popup xuất hiện
      await this.page.waitForTimeout(2000);
      
      // Method 1: Tìm button "Lưu"
      const buttons = await this.page.locator('button, div[role="button"]').all();
      
      for (const button of buttons) {
        try {
          const text = await button.textContent();
          const isVisible = await button.isVisible();
          
          if (isVisible && text && (text.trim() === 'Lưu' || 
                                     text.trim() === 'Save' ||
                                     text.includes('Lưu'))) {
            
            this.log('✓ Tìm thấy nút "Lưu"', 'info');
            await button.scrollIntoViewIfNeeded();
            await HumanBehavior.humanDelay(500, 1000);
            await button.click();
            
            this.log('✅ Đã click "Lưu"', 'success');
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Method 2: Evaluate
      const clicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          const style = window.getComputedStyle(btn);
          
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              (text === 'Lưu' || text === 'Save')) {
            
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            console.log('✓ Clicked Lưu');
            return true;
          }
        }
        return false;
      });
      
      if (clicked) {
        this.log('✅ Đã click "Lưu" (evaluate)', 'success');
      } else {
        this.log('⚠️ Không tìm thấy nút "Lưu" (có thể đã bỏ qua)', 'warning');
      }
      
      return true;
    } catch (error) {
      this.log(`⚠️ Lỗi click "Lưu": ${error.message}`, 'warning');
      return true; // Return true anyway để tiếp tục
    }
  }

  /**
   * Click "Tin cậy thiết bị này"
   */
  async clickTinCayThietBi() {
    try {
      this.log('🔍 Tìm nút "Tin cậy thiết bị này"...', 'info');
      
      // Đợi page load
      await this.page.waitForTimeout(2000);
      
      // Method 1: Tìm button
      const buttons = await this.page.locator('button, div[role="button"]').all();
      
      for (const button of buttons) {
        try {
          const text = await button.textContent();
          const isVisible = await button.isVisible();
          
          if (isVisible && text && (text.includes('Tin cậy thiết bị') || 
                                     text.includes('Trust this device') ||
                                     text.includes('Tin cậy') ||
                                     text.includes('Trust'))) {
            
            this.log('✓ Tìm thấy nút "Tin cậy thiết bị này"', 'info');
            await button.scrollIntoViewIfNeeded();
            await HumanBehavior.humanDelay(500, 1000);
            await button.click();
            
            this.log('✅ Đã click "Tin cậy thiết bị này"', 'success');
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Method 2: Evaluate
      const clicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          const style = window.getComputedStyle(btn);
          
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              (text.includes('Tin cậy thiết bị') || 
               text.includes('Trust this device') ||
               text.includes('Tin cậy') ||
               text === 'Trust')) {
            
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            console.log('✓ Clicked Tin cậy thiết bị');
            return true;
          }
        }
        return false;
      });
      
      if (clicked) {
        this.log('✅ Đã click "Tin cậy thiết bị" (evaluate)', 'success');
      } else {
        this.log('⚠️ Không tìm thấy nút "Tin cậy thiết bị" (có thể đã bỏ qua)', 'warning');
      }
      
      return true;
    } catch (error) {
      this.log(`⚠️ Lỗi click "Tin cậy thiết bị": ${error.message}`, 'warning');
      return true; // Return true anyway để tiếp tục
    }
  }

  /**
   * Đóng browser
   */
  async close() {
    try {
      // Persistent context không cần close browser
      if (this.context && !this.browser) {
        await this.context.close();
      } else if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      console.error('Lỗi đóng browser:', error);
    }
  }
}

module.exports = FacebookWith2FA;

