const { chromium } = require('playwright');

class HeadlessUploader {
  constructor(mainWindow, maxConcurrentBrowsers = 10) {
    this.mainWindow = mainWindow;
    this.maxConcurrentBrowsers = maxConcurrentBrowsers;
    this.sessionState = null;
    this.currentPageUrl = null;
    this.browsers = []; // Track all browsers for cleanup
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
      this.mainWindow.webContents.send('progress', {
        current,
        total,
        message,
        percentage: Math.round((current / total) * 100)
      });
    }
  }

  // Chia photos thành chunks cho mỗi browser
  distributePhotos(photos, numBrowsers) {
    const chunks = [];
    const total = photos.length;
    const photosPerBrowser = Math.ceil(total / numBrowsers);
    
    // Chia đều từng chunk
    for (let i = 0; i < numBrowsers; i++) {
      const start = i * photosPerBrowser;
      const end = Math.min(start + photosPerBrowser, total);
      
      // Chỉ tạo chunk nếu còn ảnh
      if (start < total) {
        const chunk = photos.slice(start, end);
        chunks.push({
          browserIndex: i + 1,
          photos: chunk
        });
      }
    }
    
    // DEBUG: Verify không có ảnh trùng
    const allPhotoPaths = chunks.flatMap(c => c.photos.map(p => p.path));
    const uniquePaths = new Set(allPhotoPaths);
    
    if (allPhotoPaths.length !== uniquePaths.size) {
      console.error('⚠️ CANH BAO: Co anh bi trung lap!');
      console.error('Tong anh:', allPhotoPaths.length, 'Unique:', uniquePaths.size);
    }
    
    return chunks;
  }

  // Set session từ main browser
  setSession(sessionState, pageUrl) {
    this.sessionState = sessionState;
    this.currentPageUrl = pageUrl;
  }

  // Upload 1 ảnh theo ĐÚNG FLOW của Facebook (từ facebook.com)
  async uploadSinglePhoto(page, photo, caption, browserIndex) {
    try {
      // Scroll lên top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300); // Tối ưu: 500ms → 300ms
      
      // BƯỚC 1: Click nút "Ảnh/video" TRỰC TIẾP
      this.log(`[Browser ${browserIndex}] Click Anh/video...`, 'info');
      
      const clickedPhotoButton = await page.evaluate(() => {
        // Ở facebook.com, nút "Ảnh/video" rất rõ ràng
        
        // Strategy 1: Tìm exact text "Ảnh/video" hoặc "Photo/video"
        const allSpans = document.querySelectorAll('span, div');
        for (const span of allSpans) {
          const text = span.textContent.trim();
          
          if (text === 'Ảnh/video' || text === 'Photo/video') {
            // Tìm button cha
            const btn = span.closest('div[role="button"]') || span.closest('[role="button"]');
            if (btn) {
              btn.scrollIntoView({ block: 'center' });
              btn.click();
              console.log('Clicked Anh/video button (exact text)');
              return true;
            }
          }
        }
        
        // Strategy 2: Tìm trong create post area
        const createArea = document.querySelector('[contenteditable="true"]');
        if (createArea) {
          const parent = createArea.closest('div');
          if (parent) {
            // Tìm trong siblings
            const buttons = parent.parentElement.querySelectorAll('div[role="button"]');
            for (const btn of buttons) {
              if (btn.textContent.includes('Ảnh') || btn.textContent.includes('Photo')) {
                btn.scrollIntoView({ block: 'center' });
                btn.click();
                console.log('Clicked photo button (near create area)');
                return true;
              }
            }
          }
        }
        
        // Strategy 3: Tìm theo aria-label
        const ariaButtons = document.querySelectorAll('[aria-label*="Photo"], [aria-label*="photo"], [aria-label*="Ảnh"]');
        for (const btn of ariaButtons) {
          if (btn.getAttribute('role') === 'button') {
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            console.log('Clicked photo button (aria-label)');
            return true;
          }
        }
        
        return false;
      });
      
      if (!clickedPhotoButton) {
        throw new Error('Khong tim thay nut Anh/video tren facebook.com');
      }
      
      this.log(`[Browser ${browserIndex}] ✓ Clicked`, 'success');
      await page.waitForTimeout(500); // Tối ưu: 800ms → 500ms
      
      // BƯỚC 2: Upload file
      this.log(`[Browser ${browserIndex}] Upload file...`, 'info');
      
      const fileInputs = await page.locator('input[type="file"]').all();
      
      if (fileInputs.length === 0) {
        throw new Error('Khong tim thay input file');
      }
      
      // Upload vào input đầu tiên (nhanh nhất)
      await fileInputs[0].setInputFiles(photo.path);
      this.log(`[Browser ${browserIndex}] ✓ Uploaded`, 'success');
      
      // Đợi popup "Tạo bài viết" xuất hiện
      await page.waitForTimeout(2000); // Tối ưu: 3000ms → 2000ms
      
      // BƯỚC 3: Điền caption vào Lexical editor của Facebook
      if (caption && caption.trim()) {
        this.log(`[Browser ${browserIndex}] Dien caption: "${caption}"`, 'info');
        
        try {
          const captionAdded = await page.evaluate((cap) => {
            // Selector BỀN: Tìm Lexical editor trong dialog hiện tại
            // Giới hạn trong role="dialog" để tránh chọn nhầm editor khác
            const editor = document.querySelector(
              'div[role="dialog"] div[contenteditable="true"][role="textbox"][data-lexical-editor="true"]'
            );
            
            if (!editor) {
              // Fallback: Nếu không có dialog, tìm editor đầu tiên
              const fallbackEditor = document.querySelector(
                'div[contenteditable="true"][role="textbox"][data-lexical-editor="true"]'
              );
              
              if (fallbackEditor) {
                console.log('✓ Tìm thấy editor (fallback)');
              } else {
                console.error('✗ Không tìm thấy Lexical editor');
                return false;
              }
              
              return processEditor(fallbackEditor, cap);
            }
            
            console.log('✓ Tìm thấy Lexical editor trong dialog');
            return processEditor(editor, cap);
            
            function processEditor(editor, caption) {
              // Scroll vào view
              editor.scrollIntoView({ block: 'center' });
              
              // Click để focus và kích hoạt editor
              editor.click();
              editor.focus();
              
              // Đợi một chút để editor ready
              setTimeout(() => {
                // Tìm thẻ <p> bên trong (Lexical structure)
                const paragraph = editor.querySelector('p');
                
                if (paragraph) {
                  // Clear nội dung cũ (thường là <br>)
                  paragraph.innerHTML = '';
                  
                  // Thêm text node (cách chuẩn với Lexical)
                  const textNode = document.createTextNode(caption);
                  paragraph.appendChild(textNode);
                  
                  console.log('✓ Caption đã điền vào <p>:', caption);
                } else {
                  // Fallback: Tạo structure mới
                  editor.innerHTML = `<p class="xdj266r x14z9mp xat24cr x1lziwak x16tdsg8" dir="auto">${caption}</p>`;
                  console.log('✓ Caption đã điền (fallback):', caption);
                }
                
                // Trigger input events để Lexical nhận biết
                editor.dispatchEvent(new InputEvent('input', { 
                  bubbles: true, 
                  cancelable: true,
                  inputType: 'insertText',
                  data: caption
                }));
                
                editor.dispatchEvent(new InputEvent('textInput', { 
                  bubbles: true,
                  data: caption
                }));
                
                editor.dispatchEvent(new Event('change', { bubbles: true }));
              }, 100);
              
              return true;
            }
          }, caption);
          
          if (captionAdded) {
            this.log(`[Browser ${browserIndex}] ✓ Caption: "${caption}"`, 'success');
            await page.waitForTimeout(800); // Tối ưu: 1200ms → 800ms
          } else {
            this.log(`[Browser ${browserIndex}] ⚠️ Không tìm thấy editor`, 'warning');
          }
        } catch (e) {
          this.log(`[Browser ${browserIndex}] Lỗi: ${e.message}`, 'error');
        }
      } else {
        await page.waitForTimeout(300); // Tối ưu: 500ms → 300ms
      }
      
      // BƯỚC 4: Click nút "Tiếp" (nút xanh đầu tiên)
      this.log(`[Browser ${browserIndex}] Click nut Tiep...`, 'info');
      
      await page.waitForTimeout(500);
      
      const clickedNext = await page.evaluate(() => {
        // Tìm nút "Tiếp"
        const allButtons = document.querySelectorAll('div[role="button"], button, span[role="button"]');
        
        for (const btn of allButtons) {
          const text = btn.textContent.trim();
          
          if (text === 'Tiếp' || text === 'Next') {
            const rect = btn.getBoundingClientRect();
            // Nút phải visible
            if (rect.width > 50 && rect.height > 30) {
              btn.scrollIntoView({ block: 'center' });
              btn.click();
              console.log('✓ Đã click nút Tiếp');
              return true;
            }
          }
        }
        
        console.log('⚠️ Không tìm thấy nút Tiếp (có thể không cần)');
        return false;
      });
      
      if (clickedNext) {
        this.log(`[Browser ${browserIndex}] ✓ Tiep`, 'success');
        // Đợi màn hình tiếp theo load
        await page.waitForTimeout(1500); // Tối ưu: 2000ms → 1500ms
      } else {
        this.log(`[Browser ${browserIndex}] Skip Tiep (khong co nut)`, 'info');
        await page.waitForTimeout(300); // Tối ưu: 500ms → 300ms
      }
      
      // BƯỚC 5: Click nút "Đăng" (nút xanh cuối cùng)
      this.log(`[Browser ${browserIndex}] Click nut Dang...`, 'info');
      
      await page.waitForTimeout(800);
      
      let posted = await page.evaluate(() => {
        // Tìm nút "Đăng" trong popup (thường là nút màu xanh)
        const allButtons = document.querySelectorAll('div[role="button"], button, span[role="button"]');
        
        for (const btn of allButtons) {
          const text = btn.textContent.trim();
          
          if (text === 'Đăng' || text === 'Post') {
            const rect = btn.getBoundingClientRect();
            // Nút phải có kích thước hợp lý (không phải text nhỏ)
            if (rect.width > 50 && rect.height > 30) {
              // Scroll vào view
              btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
              
              // Click
              setTimeout(() => {
                btn.click();
                console.log('✓ Đã click nút Đăng');
              }, 100);
              
              return true;
            }
          }
        }
        
        console.error('✗ Không tìm thấy nút Đăng');
        return false;
      });
      
      if (!posted) {
        this.log(`[Browser ${browserIndex}] Thử phím tắt Ctrl+Enter...`, 'info');
        await page.keyboard.press('Control+Enter');
      }
      
      this.log(`[Browser ${browserIndex}] ✓ Posted`, 'success');
      
      // Đợi post submit - TỐI ƯU
      await page.waitForTimeout(1500); // Tối ưu: 2000ms → 1500ms
      
      return { success: true, photo: photo.name };
    } catch (error) {
      return { 
        success: false, 
        photo: photo.name, 
        error: error.message,
        browserIndex 
      };
    }
  }

  // Upload nhiều ảnh trên 1 headless browser (RIÊNG BIỆT, KHÔNG ẢNH HƯỞNG TRANG CHÍNH)
  async uploadInBrowser(chunk, captions) {
    const browser = await chromium.launch({
      headless: true, // ⚡ HEADLESS: Tăng tốc độ
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-dev-tools',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
        '--disable-features=TranslateUI',
        '--disable-extensions'
      ]
    });

    // Track browser for cleanup
    this.browsers.push(browser);

    let context, page;
    const results = [];

    try {
      // Tạo context RIÊNG với session từ main browser
      context = await browser.newContext({
        storageState: this.sessionState,
        viewport: { width: 1280, height: 720 }
      });

      page = await context.newPage();
      
      this.log(`[Browser ${chunk.browserIndex}] Dang khoi tao trang rieng...`, 'info');
      
      // Goto FACEBOOK.COM - TỐI ƯU
      await page.goto('https://www.facebook.com/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000 
      });
      await page.waitForTimeout(1000); // Tối ưu: 1500ms → 1000ms

      this.log(`[Browser ${chunk.browserIndex}] Da vao facebook.com, san sang upload ${chunk.photos.length} anh`, 'success');

      // Upload từng ảnh với caption
      for (let i = 0; i < chunk.photos.length; i++) {
        const photo = chunk.photos[i];
        // Find caption by photo path or name
        const caption = captions[photo.path] || captions[photo.name] || '';
        
        // DEBUG: Log caption info
        if (caption) {
          this.log(`[Browser ${chunk.browserIndex}] Caption cho ${photo.name}: "${caption}"`, 'info');
        }
        
        this.log(`[Browser ${chunk.browserIndex}] [${i+1}/${chunk.photos.length}] ${photo.name}${caption ? ' (có caption)' : ''}...`, 'info');
        
        const result = await this.uploadSinglePhoto(page, photo, caption, chunk.browserIndex);
        results.push(result);
        
        if (result.success) {
          this.log(`[Browser ${chunk.browserIndex}] ✓ ${photo.name}`, 'success');
        } else {
          this.log(`[Browser ${chunk.browserIndex}] ✗ ${photo.name}: ${result.error}`, 'error');
          
          // Error recovery: Đóng dialog và reload page
          try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          } catch (e) {}
        }

        // Sau mỗi ảnh, quay lại facebook.com - TỐI ƯU
        if (i < chunk.photos.length - 1) {
          await page.waitForTimeout(800); // Tối ưu: 1000ms → 800ms
          
          this.log(`[Browser ${chunk.browserIndex}] Reload...`, 'info');
          await page.goto('https://www.facebook.com/', { 
            waitUntil: 'domcontentloaded', 
            timeout: 8000 // Tối ưu: 10000ms → 8000ms
          });
          await page.waitForTimeout(600); // Tối ưu: 800ms → 600ms
        }
      }

      this.log(`[Browser ${chunk.browserIndex}] Hoan thanh tat ca!`, 'success');

    } catch (error) {
      this.log(`[Browser ${chunk.browserIndex}] Loi: ${error.message}`, 'error');
      
      // Mark tất cả photos trong chunk này là failed
      chunk.photos.forEach(photo => {
        if (!results.find(r => r.photo === photo.name)) {
          results.push({
            success: false,
            photo: photo.name,
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
        this.log(`[Browser ${chunk.browserIndex}] Da dong browser`, 'info');
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }

    return results;
  }

  // Upload song song với nhiều headless browsers
  async uploadPhotosParallel(photos, captions = {}) {
    try {
      const total = photos.length;
      
      if (!this.sessionState || !this.currentPageUrl) {
        throw new Error('Chua co session hoac page URL');
      }

      // TÍNH SỐ BROWSERS TỐI ƯU DựA vào số ảnh
      // Công thức: Mỗi browser xử lý 2 ảnh, max 10 browsers
      let numBrowsers;
      
      if (total <= 2) {
        // 1-2 ảnh: Dùng 1 browser
        numBrowsers = 1;
      } else if (total <= 20) {
        // 3-20 ảnh: Chia đôi (mỗi browser 2 ảnh)
        numBrowsers = Math.ceil(total / 2);
      } else {
        // > 20 ảnh: Dùng max 10 browsers
        numBrowsers = Math.min(10, Math.ceil(total / 2));
      }
      
      // Tính số ảnh trên mỗi browser
      const photosPerBrowser = Math.ceil(total / numBrowsers);
      
      this.log(`🚀 BAT DAU UPLOAD HEADLESS!`, 'success');
      this.log(`📊 ${total} anh → ${numBrowsers} browsers (${photosPerBrowser} anh/browser)`, 'info');
      this.log(`💻 BAN CO THE LAM VIEC KHAC BINH THUONG!`, 'success');

      // Chia photos thành chunks
      const chunks = this.distributePhotos(photos, numBrowsers);
      
      // Verify tổng ảnh
      const totalChunkPhotos = chunks.reduce((sum, c) => sum + c.photos.length, 0);
      if (totalChunkPhotos !== total) {
        this.log(`⚠️ LOI CHIA ANH: ${total} anh → ${totalChunkPhotos} anh!`, 'error');
        throw new Error(`Loi chia anh: ${total} != ${totalChunkPhotos}`);
      }
      
      this.log(`Phan chia: ${chunks.map(c => `B${c.browserIndex}:${c.photos.length}`).join(', ')}`, 'info');

      // Chạy song song tất cả browsers
      const startTime = Date.now();
      
      const allResults = await Promise.all(
        chunks.map(chunk => this.uploadInBrowser(chunk, captions))
      );

      // Tổng hợp kết quả
      const flatResults = allResults.flat();
      const uploaded = flatResults.filter(r => r.success).length;
      const failed = flatResults.filter(r => !r.success).length;
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      this.log(`🎉 HOAN THANH HEADLESS UPLOAD!`, 'success');
      this.log(`✓ Thanh cong: ${uploaded}/${total}`, 'success');
      this.log(`✗ Loi: ${failed}`, failed > 0 ? 'warning' : 'info');
      this.log(`⏱️ Thoi gian: ${elapsed}s`, 'success');
      this.log(`⚡ Toc do: ${(uploaded / parseFloat(elapsed)).toFixed(1)} anh/giay`, 'success');

      return {
        success: true,
        uploaded,
        failed,
        total,
        elapsed: parseFloat(elapsed),
        results: flatResults
      };

    } catch (error) {
      this.log(`Loi headless upload: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        uploaded: 0,
        failed: photos.length,
        total: photos.length
      };
    }
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

module.exports = HeadlessUploader;

