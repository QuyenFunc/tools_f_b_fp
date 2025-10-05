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

  // XÓA TẤT CẢ ảnh trên trang - Đơn giản: Click ảnh đầu tiên → Xóa → Lặp lại
  async deleteAllPhotosOnPage(page, fanpageUrl, browserIndex) {
    try {
      // Vào trang ảnh của fanpage
      const photosUrl = fanpageUrl.includes('?') 
        ? `${fanpageUrl}&sk=photos_by` 
        : `${fanpageUrl}?sk=photos_by`;
      
      this.log(`[Browser ${browserIndex}] Vao trang anh: ${photosUrl}`, 'info');
      await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      
      let deletedCount = 0;
      let failedCount = 0;
      let consecutiveFailures = 0; // Đếm số lần fail liên tiếp
      let noMorePhotos = false;
      const MAX_CONSECUTIVE_FAILURES = 3; // Dừng sau 3 lần fail liên tiếp
      const MAX_TOTAL_FAILURES = 10; // Dừng sau 10 lần fail tổng
      
      // Lặp xóa cho đến khi không còn ảnh
      while (!noMorePhotos && consecutiveFailures < MAX_CONSECUTIVE_FAILURES && failedCount < MAX_TOTAL_FAILURES) {
        this.log(`[Browser ${browserIndex}] Deleted: ${deletedCount}, Failed: ${failedCount} (Consecutive: ${consecutiveFailures})`, 'info');
        
        try {
          // Tìm ảnh đầu tiên trên trang
          const photoFound = await page.evaluate(() => {
            const images = document.querySelectorAll('img[src*="scontent"]');
            
            for (const img of images) {
              const rect = img.getBoundingClientRect();
              const src = img.src;
              
              // Bỏ qua emoji, avatar, icon
              if (src && !src.includes('emoji') && !src.includes('static') && rect.width > 80) {
                // Tìm link cha (để click mở ảnh)
                const link = img.closest('a[href*="/photo/"], a[href*="fbid="]');
                
                if (link) {
                  link.scrollIntoView({ block: 'center' });
                  link.click();
                  console.log('✓ Đã click vào ảnh');
                  return true;
                }
              }
            }
            
            console.log('✗ Không còn ảnh');
            return false;
          });
          
          if (!photoFound) {
            this.log(`[Browser ${browserIndex}] Khong con anh de xoa`, 'info');
            noMorePhotos = true;
            break;
          }
          
          // Đợi ảnh mở popup
          await page.waitForTimeout(2000);
          
          // Click icon cây bút (Edit) - Đa ngôn ngữ
          const editClicked = await page.evaluate(() => {
            // Tìm tất cả buttons
            const buttons = document.querySelectorAll('div[role="button"], i[data-visualcompletion="css-img"]');
            
            for (const btn of buttons) {
              const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
              
              // Tìm nút "Chỉnh sửa" / "Edit" (icon cây bút)
              if (ariaLabel.includes('chỉnh sửa') || 
                  ariaLabel.includes('edit') ||
                  ariaLabel.includes('hành động') || 
                  ariaLabel.includes('actions') ||
                  ariaLabel.includes('more')) {
                
                const clickable = btn.closest('div[role="button"]') || btn;
                const rect = clickable.getBoundingClientRect();
                
                if (rect.width > 0 && rect.height > 0) {
                  clickable.click();
                  console.log('✓ Đã click icon cây bút/menu');
                  return true;
                }
              }
            }
            
            return false;
          });
          
          if (!editClicked) {
            this.log(`[Browser ${browserIndex}] Khong tim thay icon cay but`, 'warning');
            
            // Thử Escape nhiều lần
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            
            // Quay lại trang photos
            await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(2000);
            
            failedCount++;
            consecutiveFailures++;
            continue;
          }
          
          // Reset consecutive failures khi tìm thấy button
          consecutiveFailures = 0;
          
          await page.waitForTimeout(1200);
          
          // Click "Xóa ảnh" / "Delete photo" - Đa ngôn ngữ
          const deleteClicked = await page.evaluate(() => {
            const items = document.querySelectorAll('div[role="menuitem"], span, div[tabindex="0"]');
            
            for (const item of items) {
              const text = item.textContent.trim().toLowerCase();
              
              // Kiểm tra cả tiếng Việt & English
              if (text.includes('xóa ảnh') || 
                  text.includes('delete photo') ||
                  text.includes('xoá ảnh')) {
                
                const clickable = item.closest('div[role="menuitem"]') || 
                                item.closest('div[tabindex="0"]') || 
                                item;
                clickable.click();
                console.log('✓ Đã click "Xóa ảnh"');
                return true;
              }
            }
            
            console.error('✗ Không tìm thấy "Xóa ảnh"');
            return false;
          });
          
          if (!deleteClicked) {
            this.log(`[Browser ${browserIndex}] Khong tim thay "Xoa anh"`, 'warning');
            
            // Thử Escape nhiều lần
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            
            // Quay lại trang photos
            await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(2000);
            
            failedCount++;
            consecutiveFailures++;
            continue;
          }
          
          await page.waitForTimeout(1500);
          
          // Xác nhận xóa - ĐƠN GIẢN HÓA: Tìm nút "Xóa" trong dialog
          const confirmed = await page.evaluate(() => {
            // Tìm tất cả buttons có text "Xóa"
            const allButtons = Array.from(document.querySelectorAll('div[role="button"], button'));
            
            console.log(`Tìm thấy ${allButtons.length} buttons`);
            
            // Lọc các nút "Xóa" visible
            const deleteButtons = allButtons.filter(btn => {
              const text = btn.textContent.trim();
              const rect = btn.getBoundingClientRect();
              
              // Chỉ lấy nút có text CHÍNH XÁC là "Xóa" và visible
              return (text === 'Xóa' || text === 'Delete' || text === 'Xoá') && 
                     rect.width > 0 && rect.height > 0;
            });
            
            console.log(`Tìm thấy ${deleteButtons.length} nút "Xóa" visible`);
            
            if (deleteButtons.length === 0) {
              console.error('✗ Không tìm thấy nút "Xóa"');
              return false;
            }
            
            // Nếu chỉ có 1 nút "Xóa" → Click luôn
            if (deleteButtons.length === 1) {
              console.log('✓ Tìm thấy 1 nút "Xóa" duy nhất');
              deleteButtons[0].click();
              return true;
            }
            
            // Nếu có nhiều nút "Xóa" → Tìm nút có màu nền (primary button)
            console.log('Có nhiều nút "Xóa", tìm nút có màu...');
            
            for (const btn of deleteButtons) {
              const style = window.getComputedStyle(btn);
              const bgColor = style.backgroundColor;
              
              console.log(`Nút "Xóa": bgColor=${bgColor}`);
              
              // Tìm nút có màu nền (không phải transparent/white)
              if (bgColor && 
                  bgColor !== 'rgba(0, 0, 0, 0)' && 
                  bgColor !== 'transparent' &&
                  bgColor !== 'rgb(255, 255, 255)' &&
                  bgColor !== 'rgba(255, 255, 255, 1)') {
                
                console.log(`✓ Tìm thấy nút "Xóa" có màu: ${bgColor}`);
                btn.scrollIntoView({ block: 'center' });
                btn.click();
                return true;
              }
            }
            
            // Fallback: Click nút "Xóa" cuối cùng
            console.log('Fallback: Click nút "Xóa" cuối cùng');
            const lastBtn = deleteButtons[deleteButtons.length - 1];
            lastBtn.scrollIntoView({ block: 'center' });
            lastBtn.click();
            return true;
          });
          
          if (confirmed) {
            deletedCount++;
            consecutiveFailures = 0; // Reset khi xóa thành công
            this.log(`[Browser ${browserIndex}] ✓ Xoa thanh cong: ${deletedCount}`, 'success');
            await page.waitForTimeout(2000);
            
            // Quay lại trang ảnh
            await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(2500);
          } else {
            this.log(`[Browser ${browserIndex}] ⚠️ Khong tim thay nut xac nhan`, 'warning');
            
            // Thử phím tắt Enter
            this.log(`[Browser ${browserIndex}] Thu phim Enter...`, 'info');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            
            // Kiểm tra xem có back về trang photos không
            const currentUrl = page.url();
            if (currentUrl.includes('photos')) {
              deletedCount++;
              consecutiveFailures = 0; // Reset
              this.log(`[Browser ${browserIndex}] ✓ Xoa thanh cong (Enter)`, 'success');
              await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
              await page.waitForTimeout(2500);
            } else {
              // Thất bại - Escape nhiều lần và quay lại
              this.log(`[Browser ${browserIndex}] That bai, escape va quay lai...`, 'warning');
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
              
              // Force quay lại trang photos
              await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
              await page.waitForTimeout(2000);
              
              failedCount++;
              consecutiveFailures++;
            }
          }
          
        } catch (error) {
          this.log(`[Browser ${browserIndex}] Loi: ${error.message}`, 'error');
          failedCount++;
          consecutiveFailures++;
          
          // Escape nhiều lần và force reload
          this.log(`[Browser ${browserIndex}] Recovery mode...`, 'warning');
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(300);
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(300);
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(500);
          
          // Force reload trang photos
          await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(2500);
        }
      }
      
      // Log kết quả cuối
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        this.log(`[Browser ${browserIndex}] ⚠️ Dung do qua nhieu loi lien tiep (${consecutiveFailures})`, 'warning');
      }
      if (failedCount >= MAX_TOTAL_FAILURES) {
        this.log(`[Browser ${browserIndex}] ⚠️ Dung do qua nhieu loi tong (${failedCount})`, 'warning');
      }
      
      return {
        success: true,
        deleted: deletedCount,
        failed: failedCount,
        total: deletedCount + failedCount
      };
      
    } catch (error) {
      this.log(`[Browser ${browserIndex}] Loi nghiem trong: ${error.message}`, 'error');
      return {
        success: false,
        deleted: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    }
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

  // XÓA TẤT CẢ ảnh của 1 fanpage - Đơn giản & Tuần tự
  async deleteAllPhotosOnFanpage(fanpageUrl) {
    if (!this.sessionState) {
      throw new Error('Chua co session state');
    }
    
    this.log('🗑️ BAT DAU XOA ANH!', 'success');
    this.log(`📄 Fanpage: ${fanpageUrl}`, 'info');
    
    const startTime = Date.now();
    
    // Tạo 1 browser duy nhất
    const browser = await chromium.launch({
      headless: false, // DEBUG: Hiển thị browser
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    this.browsers.push(browser);
    
    // Tạo context với session state (ĐÚNG CÁCH)
    const contextOptions = {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    // QUAN TRỌNG: storageState chứa cookies + localStorage
    if (this.sessionState && this.sessionState.cookies) {
      contextOptions.storageState = this.sessionState;
      this.log(`✓ Restore session: ${this.sessionState.cookies.length} cookies`, 'info');
    } else {
      this.log('⚠️ Khong co session state - co the phai dang nhap!', 'warning');
    }
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    
    // Xóa tất cả ảnh
    const result = await this.deleteAllPhotosOnPage(page, fanpageUrl, 1);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    this.log('🎉 HOAN THANH XOA ANH!', 'success');
    this.log(`✓ Thanh cong: ${result.deleted}`, 'success');
    this.log(`✗ That bai: ${result.failed}`, result.failed > 0 ? 'warning' : 'info');
    this.log(`⏱️ Thoi gian: ${elapsed}s`, 'success');
    
    // Đóng browser
    await browser.close();
    
    return {
      success: true,
      deleted: result.deleted,
      failed: result.failed,
      total: result.deleted + result.failed
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

