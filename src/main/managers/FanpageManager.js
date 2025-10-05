const { chromium } = require('playwright');

// Quản lý các browser riêng biệt cho mỗi fanpage
class FanpageManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    // Map: fanpageId -> { browser, context, page, pageInfo }
    this.fanpageBrowsers = new Map();
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

  // Tạo browser riêng cho fanpage và đăng nhập vào fanpage đó
  async createFanpageBrowser(pageId, pageInfo, sessionState, headless = false) {
    try {
      this.log(`Tao browser rieng cho fanpage: ${pageInfo.name}`, 'info');

      // Nếu đã có browser cho fanpage này, đóng nó đi
      if (this.fanpageBrowsers.has(pageId)) {
        await this.closeFanpageBrowser(pageId);
      }

      // Tạo browser mới
      const browser = await chromium.launch({
        headless: headless,
        args: headless ? [] : ['--start-maximized']
      });

      // Tạo context với session - ĐÚNG CÁCH với Playwright storageState
      const contextOptions = {
        viewport: headless ? { width: 1920, height: 1080 } : null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      
      // Nếu có storageState, thêm vào
      if (sessionState && sessionState.cookies) {
        contextOptions.storageState = sessionState;
        this.log(`Restore session: ${sessionState.cookies.length} cookies`, 'info');
      } else {
        this.log('⚠️ Khong co session state!', 'warning');
      }
      
      const context = await browser.newContext(contextOptions);
      
      this.log('Da tao context moi', 'info');

      const page = await context.newPage();

      // Vào trang fanpage
      this.log(`Dang truy cap fanpage ${pageInfo.name}...`, 'info');
      const fanpageUrl = pageInfo.url || (
        pageId.startsWith('http') ? pageId :
        pageId.match(/^\d+$/) ? `https://www.facebook.com/profile.php?id=${pageId}` :
        `https://www.facebook.com/${pageId}`
      );

      await page.goto(fanpageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      await page.waitForTimeout(2000);

      // Kiểm tra xem có bị redirect về login không
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        throw new Error('Session khong hop le - bi redirect ve trang login');
      }

      // Kiểm tra có form login không
      const hasLoginForm = await page.evaluate(() => {
        return document.querySelector('input[name="email"]') !== null;
      });

      if (hasLoginForm) {
        throw new Error('Session khong hop le - co form login');
      }

      this.log('Session hop le! Dang o fanpage', 'success');

      // Chuyển sang Page mode
      await this.switchToPageMode(page);

      // Lưu browser info
      this.fanpageBrowsers.set(pageId, {
        browser,
        context,
        page,
        pageInfo,
        pageId
      });

      this.log(`Browser cho fanpage ${pageInfo.name} da san sang!`, 'success');

      return {
        success: true,
        browser,
        context,
        page
      };
    } catch (error) {
      this.log(`Loi tao browser cho fanpage: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Chuyển sang Page mode
  async switchToPageMode(page) {
    try {
      // Scroll lên top để thấy banner
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1500);

      // Tìm EXACT text "Chuyển ngay"
      const clicked = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');

        for (const el of allElements) {
          const text = el.textContent.trim();

          // Exact match
          if (text === 'Chuyển ngay' || text === 'Switch now') {
            if (el.tagName === 'A' ||
                el.tagName === 'BUTTON' ||
                el.getAttribute('role') === 'button') {

              el.scrollIntoView({ block: 'center' });
              setTimeout(() => {
                el.click();
              }, 100);
              return true;
            }

            const childBtn = el.querySelector('a, button, [role="button"]');
            if (childBtn) {
              childBtn.scrollIntoView({ block: 'center' });
              setTimeout(() => {
                childBtn.click();
              }, 100);
              return true;
            }
          }
        }

        // Fallback
        for (const el of allElements) {
          const text = el.textContent.trim();
          if (text.startsWith('Chuyển ngay')) {
            const clickable = el.closest('a, button, [role="button"]') ||
                            el.querySelector('a, button, [role="button"]');
            if (clickable) {
              clickable.scrollIntoView({ block: 'center' });
              setTimeout(() => {
                clickable.click();
              }, 100);
              return true;
            }
          }
        }

        return false;
      });

      if (clicked) {
        this.log('Da click nut "Chuyen ngay"!', 'success');
        await page.waitForTimeout(5000);
        return true;
      }

      this.log('Khong tim thay nut "Chuyen ngay"', 'warning');
      return false;
    } catch (error) {
      this.log(`Loi chuyen Page mode: ${error.message}`, 'error');
      return false;
    }
  }

  // Lấy browser của fanpage
  getFanpageBrowser(pageId) {
    return this.fanpageBrowsers.get(pageId);
  }

  // Kiểm tra fanpage đã có browser chưa
  hasFanpageBrowser(pageId) {
    return this.fanpageBrowsers.has(pageId);
  }

  // Đóng browser của fanpage
  async closeFanpageBrowser(pageId) {
    const fbBrowser = this.fanpageBrowsers.get(pageId);
    if (fbBrowser) {
      try {
        if (fbBrowser.page) await fbBrowser.page.close().catch(() => {});
        if (fbBrowser.context) await fbBrowser.context.close().catch(() => {});
        if (fbBrowser.browser) await fbBrowser.browser.close().catch(() => {});
        this.log(`Da dong browser cho fanpage ${fbBrowser.pageInfo.name}`, 'info');
      } catch (error) {
        console.error('Loi dong fanpage browser:', error);
      }
      this.fanpageBrowsers.delete(pageId);
    }
  }

  // Đóng tất cả browsers
  async closeAll() {
    for (const [pageId, _] of this.fanpageBrowsers) {
      await this.closeFanpageBrowser(pageId);
    }
    this.fanpageBrowsers.clear();
  }

  // Lấy danh sách fanpages đang active
  getActiveFanpages() {
    const result = [];
    this.fanpageBrowsers.forEach((fbBrowser, pageId) => {
      result.push({
        pageId,
        pageName: fbBrowser.pageInfo.name,
        pageUrl: fbBrowser.pageInfo.url
      });
    });
    return result;
  }
}

module.exports = FanpageManager;

