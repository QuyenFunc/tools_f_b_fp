const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class FacebookAutomation {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.currentPageId = null;
  }

  log(message, type = 'info') {
    const logData = {
      message,
      type,
      timestamp: new Date().toISOString()
    };
    // Chỉ log quan trọng ra console
    if (type === 'error' || type === 'success') {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('log', logData);
    }
  }

  progress(current, total, message) {
    const progressData = { current, total, message };
    if (this.mainWindow) {
      this.mainWindow.webContents.send('progress', progressData);
    }
  }

  async checkLoginSuccess() {
    try {
      const currentUrl = this.page.url();
      
      // Check 1: URL không chứa login
      if (currentUrl.includes('/login')) return false;
      
      // Check 2: Không có form login
      const hasLoginForm = await this.page.locator('input[name="email"]').count();
      if (hasLoginForm > 0) return false;
      
      // Check 3: Có element đặc trưng của Facebook
      const hasFacebookElements = await this.page.evaluate(() => {
        return document.querySelector('[role="feed"]') !== null ||
               document.querySelector('[role="main"]') !== null ||
               document.querySelector('a[href*="/profile.php"]') !== null ||
               document.querySelector('a[aria-label*="Profile"]') !== null;
      });
      
      return hasFacebookElements;
    } catch (e) {
      return false;
    }
  }

  async login(email, password, headless = true) {
    try {
      this.log('Dang khoi dong trinh duyet...', 'info');
      
      this.browser = await chromium.launch({
        headless: headless,
        args: headless ? [] : ['--start-maximized']
      });

      this.context = await this.browser.newContext({
        viewport: headless ? { width: 1920, height: 1080 } : null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();

      this.log('Dang truy cap Facebook...', 'info');
      await this.page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 10000 });
      await this.page.waitForTimeout(1000); // Giảm từ 2000ms

      // Điền thông tin đăng nhập
      this.log('Dang dien thong tin dang nhap...', 'info');
      await this.page.waitForSelector('input[name="email"]', { timeout: 5000 });
      await this.page.fill('input[name="email"]', email);
      await this.page.fill('input[name="pass"]', password);

      // Click login
      this.log('Dang dang nhap...', 'info');
      await this.page.click('button[name="login"]');

      // Loop check NHANH - giảm delay
      let loginSuccess = false;
      let secondLoginAttempted = false;
      const startTime = Date.now();
      const maxWaitTime = 60000; // Giảm từ 120s → 60s
      
      while (!loginSuccess && (Date.now() - startTime) < maxWaitTime) {
        await this.page.waitForTimeout(500); // Giảm từ 1000ms → 500ms
        
        // Trường hợp 1: Đã đăng nhập thành công
        if (await this.checkLoginSuccess()) {
          loginSuccess = true;
          break;
        }
        
        // Trường hợp 2: Có form login lần 2 (sau captcha)
        const hasLoginForm = await this.page.locator('input[name="email"]').count();
        if (hasLoginForm > 0 && !secondLoginAttempted) {
          const elapsed = Date.now() - startTime;
          if (elapsed > 3000) { // Giảm từ 5000ms → 3000ms
            this.log('Can dang nhap lai...', 'info');
            
            try {
              const emailVal = await this.page.locator('input[name="email"]').inputValue();
              if (!emailVal) await this.page.fill('input[name="email"]', email);
              
              const passVal = await this.page.locator('input[name="pass"]').inputValue();
              if (!passVal) await this.page.fill('input[name="pass"]', password);
              
              await this.page.click('button[name="login"]');
              secondLoginAttempted = true;
              this.log('Da gui dang nhap lan 2', 'info');
            } catch (e) {
              // Bỏ qua lỗi để tăng tốc
            }
          }
        }
        
        // Trường hợp 3: Có captcha - chỉ log 1 lần
        const elapsed = Date.now() - startTime;
        if (elapsed > 3000 && elapsed < 4000) {
          const hasCaptcha = await this.page.evaluate(() => {
            return document.querySelector('iframe[src*="recaptcha"]') !== null;
          });
          
          if (hasCaptcha) {
            this.log('Phat hien captcha! Hay tich vao "Toi khong phai robot"', 'warning');
          }
        }
      }
      
      if (loginSuccess) {
        this.log('Dang nhap thanh cong!', 'success');
        await this.page.waitForTimeout(1500);
        
        const userName = await this.getUserName();
        
        return {
          success: true,
          message: 'Dang nhap thanh cong',
          userName: userName
        };
      } else {
        throw new Error('Het thoi gian cho dang nhap (2 phut)');
      }
    } catch (error) {
      this.log(`Loi dang nhap: ${error.message}`, 'error');
      await this.close();
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSessionData() {
    try {
      const cookies = await this.context.cookies();
      const localStorage = await this.page.evaluate(() => {
        return JSON.stringify(localStorage);
      });
      
      return {
        cookies,
        localStorage
      };
    } catch (error) {
      throw new Error(`Khong the lay session data: ${error.message}`);
    }
  }

  // Lấy session state cho headless browsers  
  async getSessionState() {
    if (!this.context) {
      throw new Error('Chua co context');
    }
    return await this.context.storageState();
  }

  async loginWithSession(sessionData, headless = true) {
    try {
      this.log('Dang khoi dong trinh duyet...', 'info');
      
      this.browser = await chromium.launch({
        headless: headless,
        args: headless ? [] : ['--start-maximized']
      });

      this.context = await this.browser.newContext({
        viewport: headless ? { width: 1920, height: 1080 } : null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // Restore cookies
      if (sessionData.cookies) {
        await this.context.addCookies(sessionData.cookies);
      }

      this.page = await this.context.newPage();

      // Restore localStorage
      if (sessionData.localStorage) {
        await this.page.addInitScript(storage => {
          const data = JSON.parse(storage);
          for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, value);
          }
        }, sessionData.localStorage);
      }

      this.log('Dang xac minh session...', 'info');
      await this.page.goto('https://www.facebook.com/', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });

      // Kiểm tra NHANH
      await this.page.waitForTimeout(1500); // Giảm từ 3000ms
      
      const isLoggedIn = await this.page.evaluate(() => {
        return !document.querySelector('input[name="email"]');
      });

      if (isLoggedIn) {
        this.log('Dang nhap bang session thanh cong!', 'success');
        
        // Lấy tên user
        const userName = await this.getUserName();
        
        return {
          success: true,
          message: 'Dang nhap thanh cong',
          userName: userName
        };
      } else {
        this.log('Session da het han', 'error');
        await this.close();
        return {
          success: false,
          error: 'Session da het han, vui long dang nhap lai'
        };
      }
    } catch (error) {
      this.log(`Loi dang nhap bang session: ${error.message}`, 'error');
      await this.close();
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserName() {
    try {
      // Đảm bảo đang ở trang chủ trước khi lấy tên (tránh đang ở fanpage)
      try {
        await this.page.goto('https://www.facebook.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
      } catch (_) {}

      // Đợi trang load xong
      await this.page.waitForTimeout(2000);
      
      // Thử nhiều cách để lấy tên người dùng
      const name = await this.page.evaluate(() => {
        const DISALLOWED = [
          'Công cụ chuyên nghiệp', 'Professional tools', 'Công cụ', 'Trang chủ', 'Home',
          'Watch', 'Marketplace', 'Reels', 'Video', 'Bạn bè', 'Friends', 'Groups', 'Pages',
          'Facebook', 'Tạo', 'Create'
        ].map(s => s.toLowerCase());
        const isValidCandidate = (text) => {
          if (!text) return false;
          const t = text.trim();
          if (t.length < 3 || t.length > 50) return false;
          if (DISALLOWED.includes(t.toLowerCase())) return false;
          return true;
        };
        // Phương pháp 1: Từ nút menu tài khoản (chính xác nhất)
        const accountButton = document.querySelector('[aria-label^="Tài khoản của"], [aria-label^="Account of"]');
        if (accountButton) {
          const ariaLabel = accountButton.getAttribute('aria-label');
          // "Tài khoản của Tên Người Dùng" -> lấy "Tên Người Dùng"
          const match = ariaLabel.match(/của\s+(.+)$/i) || ariaLabel.match(/of\s+(.+)$/i);
          if (match && match[1] && isValidCandidate(match[1])) {
            return match[1].trim();
          }
        }
        
        // Phương pháp 2: Từ link profile trong menu
        const profileLink = document.querySelector('a[href*="/profile.php?id="], a[href*="facebook.com/"][href*="/profile"]');
        if (profileLink) {
          // Tìm thẻ strong hoặc span bên trong chứa tên
          const strongTag = profileLink.querySelector('strong');
          if (strongTag && isValidCandidate(strongTag.textContent)) {
            return strongTag.textContent.trim();
          }
          
          const spanTag = profileLink.querySelector('span[dir="auto"]');
          if (spanTag && isValidCandidate(spanTag.textContent)) {
            const text = spanTag.textContent.trim();
            // Chỉ lấy nếu không phải là menu item
            if (!['Trang chủ', 'Home', 'Video', 'Watch', 'Marketplace'].includes(text)) {
              return text;
            }
          }
        }
        
        // Phương pháp 3: Từ ảnh avatar (alt có thể chứa tên)
        const avatarImg = document.querySelector('img[alt*="của"], img[alt*="of"], img[alt*="profile" i]');
        if (avatarImg && avatarImg.alt && isValidCandidate(avatarImg.alt)) {
          const alt = avatarImg.alt.trim();
          const m = alt.match(/của\s+(.+)$/i) || alt.match(/of\s+(.+)$/i);
          if (m && m[1] && isValidCandidate(m[1])) return m[1].trim();
        }

        // Phương pháp 4: Từ document title khi ở trang chủ
        if (document.title && !document.title.startsWith('Facebook')) {
          const titleParts = document.title.split('|');
          if (titleParts.length > 0) {
            const possibleName = titleParts[0].trim();
            if (isValidCandidate(possibleName)) {
              return possibleName;
            }
          }
        }
        
        // Phương pháp 5: Từ meta tag
        const metaTag = document.querySelector('meta[property="og:title"]');
        if (metaTag) {
          const content = metaTag.getAttribute('content');
          if (content && !content.startsWith('Facebook') && isValidCandidate(content)) {
            return content.trim();
          }
        }
        
        // Phương pháp 6: Đi đến trang profile để lấy tên
        return null;
      });
      
      if (name) {
        this.log(`Lay duoc ten: ${name}`, 'info');
        return name;
      }
      
      // Nếu không lấy được hoặc giá trị có vẻ chung chung, đi đến trang profile
      this.log('Dang chuyen den trang ca nhan de lay ten...', 'info');
      const currentUrl = this.page.url();
      
      try {
        await this.page.goto('https://www.facebook.com/me', { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        await this.page.waitForTimeout(2000);
        
        const profileName = await this.page.evaluate(() => {
          // Lấy từ thẻ h1 trong profile
          const h1 = document.querySelector('h1');
          if (h1 && h1.textContent.trim()) {
            return h1.textContent.trim();
          }
          
          // Lấy từ title
          if (document.title) {
            const parts = document.title.split('|');
            if (parts[0] && parts[0].trim()) {
              return parts[0].trim();
            }
          }
          
          return null;
        });
        
        // Quay lại trang cũ
        await this.page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        if (profileName) {
          this.log(`Lay duoc ten tu profile: ${profileName}`, 'info');
          return profileName;
        }
      } catch (error) {
        this.log(`Loi khi lay ten tu profile: ${error.message}`, 'error');
      }
      
      return 'Người dùng';
    } catch (error) {
      this.log(`Loi lay ten nguoi dung: ${error.message}`, 'error');
      return 'Người dùng';
    }
  }

  async getFanpages() {
    try {
      this.log('Dang lay danh sach Fanpage...', 'info');
      
      // Truy cập trang quản lý pages - TỐI ƯU
      const targetUrl = 'https://www.facebook.com/pages/?category=your_pages';
      const currentUrl = this.page.url();
      
      await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await this.page.waitForTimeout(1500); // Giảm từ 3000ms
    
      // Scroll nhẹ - NHANH HƠN
      for (let i = 0; i < 2; i++) {
        await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.page.waitForTimeout(500); // Giảm từ 1000ms
      }
    
      // Lấy danh sách pages
      const pages = await this.page.evaluate(() => {
        const pagesData = [];
        const seen = new Set();
        
        // Tìm tất cả link có thể là page
        const allLinks = document.querySelectorAll('a[href]');
        
        allLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (!href) return;
          
          // Lọc link hợp lệ
          const isValidLink = href.includes('/profile.php?id=') || 
                             href.match(/^\/[a-zA-Z0-9._-]{3,50}\/?$/);
          
          if (isValidLink && 
              !href.includes('/pages') && 
              !href.includes('/login') &&
              !href.includes('/friends') &&
              !href.includes('/settings')) {
            
            let name = link.textContent.trim();
            
            // Clean name
            if (name.length > 100) {
              const shortEl = link.querySelector('span, strong, h2, h3');
              if (shortEl) name = shortEl.textContent.trim();
            }
            
            if (name && 
                name.length > 2 && 
                name.length < 80 && 
                !name.includes('http') &&
                !name.toLowerCase().includes('create')) {
              
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
    
      // Loại duplicate
      const uniquePages = [];
      const seenNames = new Set();
      
      pages.forEach(page => {
        if (!seenNames.has(page.name)) {
          seenNames.add(page.name);
          uniquePages.push(page);
        }
      });
    
      // Quay lại trang cũ
      await this.page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    
      this.log(`Tim thay ${uniquePages.length} Fanpage`, 'success');
      return uniquePages;
    } catch (error) {
      this.log(`Loi lay danh sach Fanpage: ${error.message}`, 'error');
      
      // Fallback: return empty array thay vì throw error
      return [];
    }
  }

  // KHÔNG CÒN DÙNG - Giờ dùng FanpageManager để tạo browser riêng
  async selectFanpage(pageId) {
    this.log('⚠️ selectFanpage() không còn được dùng. Hãy dùng FanpageManager', 'warning');
    return {
      success: false,
      error: 'Please use FanpageManager instead'
    };
  }

  async switchToPageMode(targetPage = this.page) {
    try {
      this.log('Dang tim nut "Chuyen ngay"...', 'info');
      
      // Scroll lên top để thấy banner
      await targetPage.evaluate(() => window.scrollTo(0, 0));
      await targetPage.waitForTimeout(1500);
      
      // Tìm EXACT text "Chuyển ngay"
      const clicked = await targetPage.evaluate(() => {
        // Tìm tất cả elements
        const allElements = document.querySelectorAll('*');
        
        for (const el of allElements) {
          const text = el.textContent.trim();
          
          // Exact match
          if (text === 'Chuyển ngay' || text === 'Switch now') {
            // Kiểm tra xem có phải button/link không
            if (el.tagName === 'A' || 
                el.tagName === 'BUTTON' || 
                el.getAttribute('role') === 'button') {
              
              el.scrollIntoView({ block: 'center' });
              setTimeout(() => {
                el.click();
                console.log('Clicked:', text);
              }, 100);
              return true;
            }
            
            // Hoặc check xem có chứa button con không
            const childBtn = el.querySelector('a, button, [role="button"]');
            if (childBtn) {
              childBtn.scrollIntoView({ block: 'center' });
              setTimeout(() => {
                childBtn.click();
                console.log('Clicked child button');
              }, 100);
              return true;
            }
          }
        }
        
        // Fallback: Tìm element có text bắt đầu bằng "Chuyển ngay"
        for (const el of allElements) {
          const text = el.textContent.trim();
          if (text.startsWith('Chuyển ngay')) {
            const clickable = el.closest('a, button, [role="button"]') || 
                            el.querySelector('a, button, [role="button"]');
            if (clickable) {
              clickable.scrollIntoView({ block: 'center' });
              setTimeout(() => {
                clickable.click();
                console.log('Clicked fallback:', text);
              }, 100);
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (clicked) {
        this.log('Da click nut "Chuyen ngay"!', 'success');
        await targetPage.waitForTimeout(5000); // Đợi lâu hơn cho page reload
        return true;
      }
      
      this.log('Khong tim thay nut "Chuyen ngay"', 'warning');
      
      // Fallback: Tìm bất kỳ text nào có "chuyển sang trang"
      const fallback = await targetPage.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        if (bodyText.includes('chuyển sang trang') || bodyText.includes('switch to page')) {
          // Tìm button gần text này
          const allButtons = document.querySelectorAll('a, button, [role="button"]');
          for (const btn of allButtons) {
            if (btn.textContent.toLowerCase().includes('chuy')) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      });
      
      if (fallback) {
        this.log('Da click nut chuyen (fallback)', 'success');
        await targetPage.waitForTimeout(5000);
        return true;
      }
      
      return false;
    } catch (error) {
      this.log(`Loi: ${error.message}`, 'error');
      return false;
    }
  }

  async countPhotos(targetPage = this.page) {
    try {
      this.log('Dem anh...', 'info');
      
      // QUICK ESTIMATE: Đọc số từ UI text (NHANH NHẤT, KHÔNG SCROLL)
      const countFromText = await targetPage.evaluate(() => {
        // Tìm text dạng "Ảnh của bạn · 123"
        const allText = document.body.innerText;
        
        // Patterns để tìm số ảnh
        const patterns = [
          /(\d+)\s*ảnh/i,
          /(\d+)\s*photos?/i,
          /photos?[:\s·]+(\d+)/i,
          /ảnh[:\s·]+(\d+)/i
        ];
        
        for (const pattern of patterns) {
          const match = allText.match(pattern);
          if (match && match[1]) {
            const num = parseInt(match[1]);
            if (num > 0 && num < 999999) {
              console.log('Found count from text:', num);
              return num;
            }
          }
        }
        
        return 0;
      });
      
      if (countFromText > 0) {
        this.log(`Tim thay ${countFromText} anh (tu text)`, 'success');
        return countFromText;
      }
      
      // Fallback: Đếm nhanh (KHÔNG scroll)
      const count = await targetPage.evaluate(() => {
        const uniquePhotos = new Set();
        
        const allImages = document.querySelectorAll('img[src*="scontent"]');
        allImages.forEach(img => {
          const src = img.src;
          const rect = img.getBoundingClientRect();
          
          if (src && 
              !src.includes('emoji') && 
              !src.includes('static') && 
              rect.width > 50) {
            uniquePhotos.add(src);
          }
        });
        
        return uniquePhotos.size;
      });
      
      this.log(`Dem duoc ${count} anh (estimate)`, 'success');
      return count;
    } catch (error) {
      this.log(`Loi dem anh: ${error.message}`, 'error');
      return 0;
    }
  }

  async scanPhotos(options = {}) {
    try {
      this.log('Quet anh (khong anh huong trang chinh)...', 'info');
      
      if (!this.currentPageId) {
        throw new Error('Chua chon Fanpage');
      }

      // TẠO TAB MỚI để scan (KHÔNG ẢNH HƯỞNG trang chính)
      const scanPage = await this.context.newPage();
      
      try {
        // Goto trang Photos trong tab mới
        const url = this.currentPageId.startsWith('http') ? this.currentPageId : 
                    this.currentPageId.match(/^\d+$/) ? `https://www.facebook.com/profile.php?id=${this.currentPageId}` :
                    `https://www.facebook.com${this.currentPageId}`;
        
        const photosUrl = url + (url.includes('?') ? '&sk=photos_by' : '?sk=photos_by');
        
        await scanPage.goto(photosUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 10000 
        });
        await scanPage.waitForTimeout(1500);

        // Scroll để load ảnh
        this.log('Dang load anh...', 'info');
        const maxScroll = Math.min(15, Math.ceil((options.maxPhotos || 1000) / 20));
        
        for (let i = 0; i < maxScroll; i++) {
          await scanPage.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
          await scanPage.waitForTimeout(600);
          this.progress(i + 1, maxScroll, `Load anh ${i + 1}/${maxScroll}...`);
        }

        // Lấy danh sách ảnh
        const photos = await scanPage.evaluate((opts) => {
          const photosData = [];
          const seen = new Set();

          const allImages = document.querySelectorAll('img[src*="scontent"]');
          
          allImages.forEach(img => {
            const src = img.src;
            const rect = img.getBoundingClientRect();
            
            if (src && 
                !src.includes('emoji') && 
                !src.includes('static') && 
                rect.width > 50 &&
                !seen.has(src)) {
              seen.add(src);
              
              let link = img.closest('a[href*="/photo/"]') || 
                        img.closest('a[href*="fbid="]');
              
              photosData.push({
                url: link ? link.href : src,
                thumbnail: src,
                id: link ? link.href : src
              });
            }
          });

          return photosData.slice(0, opts.maxPhotos || 1000);
        }, options);

        this.log(`Quet duoc ${photos.length} anh`, 'success');
        
        // ĐÓNG TAB SCAN
        await scanPage.close();
        
        return {
          success: true,
          photos: photos
        };
      } catch (error) {
        await scanPage.close().catch(() => {});
        throw error;
      }
    } catch (error) {
      this.log(`Loi quet anh: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        photos: []
      };
    }
  }

  async deletePhotos(photoIds, dryRun = false) {
    try {
      const total = photoIds.length;
      this.log(`${dryRun ? '[DRY RUN] ' : ''}Bat dau xoa ${total} anh...`, 'info');
      
      let deleted = 0;
      let failed = 0;

      for (let i = 0; i < photoIds.length; i++) {
        const photoId = photoIds[i];
        this.progress(i + 1, total, `Dang xoa anh ${i + 1}/${total}`);

        try {
          if (dryRun) {
            this.log(`[DRY RUN] Se xoa: ${photoId}`, 'info');
            await this.page.waitForTimeout(100);
            deleted++;
            continue;
          }

          // Mở ảnh
          await this.page.goto(photoId, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await this.page.waitForTimeout(1000);

          // Click menu
          const menuClicked = await this.page.evaluate(() => {
            const menus = document.querySelectorAll('[aria-label*="More"], [aria-label*="Actions"], div[role="button"]');
            for (const menu of menus) {
              const label = menu.getAttribute('aria-label') || '';
              if (label.includes('More') || label.includes('Actions')) {
                menu.click();
                return true;
              }
            }
            return false;
          });

          if (!menuClicked) throw new Error('Khong tim thay menu');
          await this.page.waitForTimeout(800);

          // Click Delete
          await this.page.evaluate(() => {
            const items = document.querySelectorAll('span, div[role="menuitem"]');
            for (const item of items) {
              const text = item.textContent;
              if (text.includes('Xóa ảnh') || text.includes('Delete photo')) {
                item.click();
                return true;
              }
            }
          });

          await this.page.waitForTimeout(800);

          // Confirm
          await this.page.evaluate(() => {
            const buttons = document.querySelectorAll('button, div[role="button"]');
            for (const btn of buttons) {
              if (btn.textContent.trim() === 'Xóa' || btn.textContent.trim() === 'Delete') {
                btn.click();
                return;
              }
            }
          });

          await this.page.waitForTimeout(1000);

          deleted++;
          this.log(`✓ Xoa ${i + 1}/${total}`, 'success');
        } catch (error) {
          failed++;
          this.log(`✗ ${i + 1}: ${error.message}`, 'error');
          await this.page.keyboard.press('Escape').catch(() => {});
        }

        await this.page.waitForTimeout(500);
      }

      this.log(`${dryRun ? '[DRY RUN] ' : ''}Hoan thanh! Da xoa: ${deleted}, Loi: ${failed}`, 'success');
      
      return {
        success: true,
        deleted,
        failed,
        total
      };
    } catch (error) {
      this.log(`Loi xoa anh: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload trên MAIN browser - KHÔNG NÊN DÙNG
  // Trang chính KHÔNG được động gì - CHỈ dùng headless mode
  async uploadPhotos(photos, captions = {}) {
    try {
      const total = photos.length;
      this.log(`❌ KHONG NEN UPLOAD TREN MAIN BROWSER!`, 'error');
      this.log(`⚠️ Trang chinh se bi anh huong, hay dung HEADLESS MODE!`, 'warning');
      this.log(`Bat dau upload ${total} anh...`, 'info');
      
      if (!this.currentPageId) {
        throw new Error('Chua chon Fanpage');
      }

      const url = this.currentPageId.startsWith('http') ? this.currentPageId : 
                  this.currentPageId.match(/^\d+$/) ? `https://www.facebook.com/profile.php?id=${this.currentPageId}` :
                  `https://www.facebook.com${this.currentPageId}`;

      let uploaded = 0;
      let failed = 0;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        this.progress(i + 1, total, `Dang upload anh ${i + 1}/${total}`);

        try {
          // Đảm bảo ở trang chính
          await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await this.page.waitForTimeout(3000);
          
          await this.page.evaluate(() => window.scrollTo(0, 0));
          await this.page.waitForTimeout(1000);
          
          this.log(`[${i+1}/${total}] ${photo.name}`, 'info');
          
          // Click nút "Ảnh/video"
          this.log('Click nut Anh/video...', 'info');
          const clickedBtn = await this.page.evaluate(() => {
            const allButtons = document.querySelectorAll('div[role="button"], span');
            for (const btn of allButtons) {
              const text = btn.textContent.trim();
              if (text === 'Ảnh/video' || text === 'Photo/video') {
                const clickable = btn.closest('div[role="button"]') || btn;
                clickable.click();
                return true;
              }
            }
            return false;
          });
          
          await this.page.waitForTimeout(1500);
          
          // Upload file
          this.log('Upload file...', 'info');
          const fileInputs = await this.page.locator('input[type="file"]').all();
          if (fileInputs.length === 0) throw new Error('Khong tim thay input file');
          
          await fileInputs[0].setInputFiles(photo.path);
          await this.page.waitForTimeout(3000);
          
          // Caption
          const caption = captions[photo.name] || '';
          if (caption) {
            try {
              const textBox = await this.page.locator('div[contenteditable="true"]').first();
              await textBox.click();
              await textBox.fill(caption);
              await this.page.waitForTimeout(500);
            } catch (e) {}
          }

          // Click "Tiếp" nếu có
          await this.page.evaluate(() => {
            const buttons = document.querySelectorAll('div[role="button"], button');
            for (const btn of buttons) {
              if (btn.textContent.trim() === 'Tiếp' || btn.textContent.trim() === 'Next') {
                btn.click();
                return true;
              }
            }
          });
          
          await this.page.waitForTimeout(2000);

          // Click "Đăng"
          this.log('Click nut Dang...', 'info');
          let posted = false;
          
          try {
            const postButton = await this.page.locator('div[role="button"]:has-text("Đăng"), div[role="button"]:has-text("Post")').first();
            await postButton.click({ timeout: 3000 });
            posted = true;
          } catch (e) {}
          
          if (!posted) {
            posted = await this.page.evaluate(() => {
              const buttons = document.querySelectorAll('div[role="button"], button');
              for (const btn of buttons) {
                if (btn.textContent.trim() === 'Đăng' || btn.textContent.trim() === 'Post') {
                  btn.click();
                  return true;
                }
              }
              return false;
            });
          }
          
          if (!posted) {
            await this.page.keyboard.press('Control+Enter');
          }

          await this.page.waitForTimeout(4000);

          uploaded++;
          this.log(`✓ ${photo.name}`, 'success');
          
        } catch (error) {
          failed++;
          this.log(`✗ ${photo.name}: ${error.message}`, 'error');
          
          await this.page.keyboard.press('Escape').catch(() => {});
          await this.page.keyboard.press('Escape').catch(() => {});
          await this.page.waitForTimeout(1000);
        }
      }

      this.log(`🎉 HOAN THANH! Thanh cong: ${uploaded}/${total}, Loi: ${failed}`, 'success');
      
      return {
        success: true,
        uploaded,
        failed,
        total
      };
    } catch (error) {
      this.log(`Loi upload: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.log('Da dong trinh duyet', 'info');
    } catch (error) {
      console.error('Loi dong browser:', error);
    }
  }
}

module.exports = FacebookAutomation;


