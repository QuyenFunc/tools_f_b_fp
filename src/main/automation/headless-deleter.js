const { chromium } = require('playwright');

class HeadlessDeleter {
  constructor(mainWindow, maxConcurrentBrowsers = 5) {
    this.mainWindow = mainWindow;
    this.maxConcurrentBrowsers = maxConcurrentBrowsers;
    this.sessionState = null;
    this.browsers = []; // Track all browsers for cleanup
  }

  log(message, type = 'info') {
    const logData = {
      message,
      type,
      timestamp: new Date().toISOString()
    };
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('log', logData);
    }
  }

  progress(current, total, message) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('progress', { current, total, message });
    }
  }

  setSession(sessionState) {
    this.sessionState = sessionState;
  }

  // Xóa 1 ảnh theo ĐÚNG FLOW Facebook: Scroll → Click cây bút → Xóa ảnh → Xóa
  async deleteSinglePhotoFromGrid(page, photoIndex, browserIndex) {
    try {
      // Scroll đến ảnh và click nút cây bút (edit)
      const editClicked = await page.evaluate((idx) => {
        const allImages = document.querySelectorAll('img[src*="scontent"]');
        const photoImages = Array.from(allImages).filter(img => {
          const src = img.src;
          const rect = img.getBoundingClientRect();
          return src && !src.includes('emoji') && !src.includes('static') && rect.width > 50;
        });
        
        if (idx >= photoImages.length) {
          return { success: false, error: 'Index out of range' };
        }
        
        const targetImg = photoImages[idx];
        
        // Scroll đến ảnh
        targetImg.scrollIntoView({ block: 'center' });
        
        // Tìm container cha của ảnh (chứa nút edit)
        const container = targetImg.closest('div[role="none"]') || 
                         targetImg.closest('div[class*="x1i"]') ||
                         targetImg.parentElement.parentElement;
        
        if (!container) {
          return { success: false, error: 'Khong tim thay container' };
        }
        
        // Hover để hiện nút edit
        const hoverEvent = new MouseEvent('mouseover', {
          bubbles: true,
          view: window
        });
        container.dispatchEvent(hoverEvent);
        
        return { success: true };
      }, photoIndex);
      
      if (!editClicked.success) {
        throw new Error(editClicked.error || 'Khong tim thay anh');
      }
      
      await page.waitForTimeout(500); // Đợi nút cây bút xuất hiện

      // Click nút cây bút (edit icon)
      const editButtonClicked = await page.evaluate(() => {
        // Tìm nút cây bút - thường có aria-label "Chỉnh sửa" hoặc icon
        const editButtons = document.querySelectorAll('div[role="button"], i[data-visualcompletion="css-img"]');
        
        for (const btn of editButtons) {
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const parent = btn.closest('div[role="button"]');
          
          // Tìm nút có aria-label "Chỉnh sửa" hoặc SVG icon cây bút
          if (ariaLabel.includes('Chỉnh sửa') || 
              ariaLabel.includes('Edit') ||
              btn.querySelector('svg')) {
            
            const rect = (parent || btn).getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              (parent || btn).click();
              return true;
            }
          }
        }
        return false;
      });

      if (!editButtonClicked) {
        throw new Error('Khong tim thay nut cay but');
      }
      
      await page.waitForTimeout(400);

      // Click "Xóa ảnh" trong menu
      const deleteClicked = await page.evaluate(() => {
        const items = document.querySelectorAll('span, div[role="menuitem"]');
        for (const item of items) {
          const text = item.textContent.trim();
          if (text === 'Xóa ảnh' || text === 'Delete photo') {
            const clickable = item.closest('div[role="menuitem"]') || item;
            clickable.click();
            return true;
          }
        }
        return false;
      });

      if (!deleteClicked) {
        throw new Error('Khong tim thay "Xoa anh"');
      }
      
      await page.waitForTimeout(400);

      // Click "Xóa" để confirm
      const confirmed = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          if (text === 'Xóa' || text === 'Delete') {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (!confirmed) {
        await page.keyboard.press('Enter');
      }

      await page.waitForTimeout(500);

      return { success: true, photoIndex };
    } catch (error) {
      try {
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
      } catch (e) {}
      
      return { 
        success: false, 
        photoIndex, 
        error: error.message,
        browserIndex 
      };
    }
  }

  // Xóa nhiều ảnh trên 1 browser - TỪ GRID (NHANH!)
  async deleteInBrowser(chunk, pageUrl) {
    const browser = await chromium.launch({
      headless: false, // DEBUG: Hiển thị browser để debug
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // Track browser for cleanup
    this.browsers.push(browser);

    let context, page;
    const results = [];

    try {
      context = await browser.newContext({
        storageState: this.sessionState,
        viewport: { width: 1280, height: 720 }
      });

      page = await context.newPage();
      
      this.log(`[B${chunk.browserIndex}] Khoi tao...`, 'info');
      
      // Goto trang Photos ĐÚNG THEO YÊU CẦU: profile.php?id=XXX&sk=photos
      let photosUrl;
      if (pageUrl.includes('profile.php?id=')) {
        // Đã có id, chỉ cần thêm &sk=photos
        photosUrl = pageUrl.split('&sk=')[0] + '&sk=photos';
      } else {
        // Chuyển sang format profile.php?id=XXX&sk=photos
        photosUrl = pageUrl.includes('?') ? pageUrl + '&sk=photos' : pageUrl + '?sk=photos';
      }
      
      await page.goto(photosUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 8000 
      });
      await page.waitForTimeout(1200); // Đợi load xong
      
      // Scroll NHANH để load ảnh
      for (let i = 0; i < 2; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await page.waitForTimeout(500);
      }

      this.log(`[B${chunk.browserIndex}] Bat dau xoa ${chunk.photos.length} anh`, 'info');

      // Xóa từng ảnh - LUÔN XÓA INDEX 0
      for (let i = 0; i < chunk.photos.length; i++) {
        this.progress(i + 1, chunk.photos.length, `[B${chunk.browserIndex}] Xoa ${i+1}/${chunk.photos.length}`);
        
        const result = await this.deleteSinglePhotoFromGrid(page, 0, chunk.browserIndex);
        results.push(result);
        
        if (result.success) {
          this.log(`[B${chunk.browserIndex}] ✓ ${i+1}/${chunk.photos.length}`, 'success');
        } else {
          this.log(`[B${chunk.browserIndex}] ✗ ${i+1}: ${result.error}`, 'error');
        }

        await page.waitForTimeout(200); // Giảm từ 400ms
      }

      this.log(`[B${chunk.browserIndex}] Hoan thanh!`, 'success');

    } catch (error) {
      this.log(`[B${chunk.browserIndex}] Loi: ${error.message}`, 'error');
      
      chunk.photos.forEach(photo => {
        if (!results.find(r => r.photoUrl === photo.url || r.photoUrl === photo.id)) {
          results.push({
            success: false,
            photoUrl: photo.url || photo.id,
            error: error.message,
            browserIndex: chunk.browserIndex
          });
        }
      });
    } finally {
      try {
        if (page) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
      } catch (e) {}
    }

    return results;
  }

  // Chia photos thành chunks
  distributePhotos(photos, numBrowsers) {
    const chunks = [];
    const total = photos.length;
    const photosPerBrowser = Math.ceil(total / numBrowsers);
    
    for (let i = 0; i < numBrowsers; i++) {
      const start = i * photosPerBrowser;
      const end = Math.min(start + photosPerBrowser, total);
      
      if (start < total) {
        chunks.push({
          browserIndex: i + 1,
          photos: photos.slice(start, end)
        });
      }
    }
    
    return chunks;
  }

  // Xóa song song với nhiều browsers
  async deletePhotosParallel(photos, pageUrl) {
    const total = photos.length;
    
    if (!this.sessionState) {
      throw new Error('Chua co session');
    }
    
    if (!pageUrl) {
      throw new Error('Chua co page URL');
    }

    // Tính số browsers (max 5 cho xóa)
    let numBrowsers;
    if (total <= 10) {
      numBrowsers = 1; // 1-10 ảnh: 1 browser
    } else if (total <= 50) {
      numBrowsers = Math.min(3, Math.ceil(total / 15)); // 11-50: 2-3 browsers
    } else {
      numBrowsers = 5; // >50: max 5 browsers
    }
    
    const photosPerBrowser = Math.ceil(total / numBrowsers);
    
    this.log(`🗑️ BAT DAU XOA TU GRID!`, 'success');
    this.log(`📊 ${total} anh → ${numBrowsers} browsers (${photosPerBrowser} anh/browser)`, 'info');

    const chunks = this.distributePhotos(photos, numBrowsers);
    
    const totalChunkPhotos = chunks.reduce((sum, c) => sum + c.photos.length, 0);
    if (totalChunkPhotos !== total) {
      throw new Error(`Loi chia anh: ${total} != ${totalChunkPhotos}`);
    }
    
    this.log(`Phan chia: ${chunks.map(c => `B${c.browserIndex}:${c.photos.length}`).join(', ')}`, 'info');

    const startTime = Date.now();
    
    const allResults = await Promise.all(
      chunks.map(chunk => this.deleteInBrowser(chunk, pageUrl))
    );

    const flatResults = allResults.flat();
    const deleted = flatResults.filter(r => r.success).length;
    const failed = flatResults.filter(r => !r.success).length;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    this.log(`🎉 HOAN THANH XOA!`, 'success');
    this.log(`✓ Da xoa: ${deleted}/${total}`, 'success');
    this.log(`✗ Loi: ${failed}`, failed > 0 ? 'warning' : 'info');
    this.log(`⏱️ Thoi gian: ${elapsed}s`, 'info');

    return {
      success: true,
      deleted,
      failed,
      total,
      elapsed,
      results: flatResults
    };
  }

  // Close all browsers
  async close() {
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    this.browsers = [];
  }
}

module.exports = HeadlessDeleter;

