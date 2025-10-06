/**
 * CAPTCHA EVASION SYSTEM - ULTRA ADVANCED 2025
 * 
 * Strategies:
 * 1. Prevent captcha from appearing (behavioral patterns)
 * 2. Detect captcha early and solve automatically
 * 3. Use proven bypass techniques
 */
class CaptchaEvasion {
  constructor() {
    this.captchaAttempts = 0;
    this.maxAttempts = 3;
  }

  /**
   * PREVENT CAPTCHA - Behavioral techniques
   */
  static getAntiCaptchaBehaviors() {
    return {
      // 1. Slow down actions
      actionDelay: {
        min: 3000,
        max: 8000,
      },

      // 2. Random mouse movements before actions
      mouseMovementBeforeAction: true,

      // 3. Read page content (simulate human)
      readPageBeforeAction: true,

      // 4. Variable typing speed
      typingSpeed: {
        min: 100,
        max: 300,
      },

      // 5. Scroll patterns
      scrollBeforeAction: true,
      scrollAmount: {
        min: 100,
        max: 500,
      },
    };
  }

  /**
   * DETECT CAPTCHA on page
   */
  static async detectCaptcha(page) {
    try {
      const captchaDetected = await page.evaluate(() => {
        // Check for reCAPTCHA
        const recaptcha = document.querySelector('iframe[src*="recaptcha"]') || 
                         document.querySelector('.g-recaptcha') ||
                         document.querySelector('[data-sitekey]');
        
        // Check for hCaptcha
        const hcaptcha = document.querySelector('iframe[src*="hcaptcha"]') ||
                        document.querySelector('.h-captcha');
        
        // Check for Facebook checkpoint
        const checkpoint = document.querySelector('[action*="/checkpoint/"]') ||
                          document.querySelector('form[action*="checkpoint"]');
        
        // Check for "I'm not a robot"
        const robotCheck = document.body.innerText.toLowerCase().includes("i'm not a robot") ||
                          document.body.innerText.toLowerCase().includes('verify') ||
                          document.body.innerText.toLowerCase().includes('security check');
        
        return {
          hasRecaptcha: !!recaptcha,
          hasHcaptcha: !!hcaptcha,
          hasCheckpoint: !!checkpoint,
          hasRobotCheck: robotCheck,
          detected: !!(recaptcha || hcaptcha || checkpoint || robotCheck),
        };
      });

      return captchaDetected;
    } catch (error) {
      console.error('Error detecting captcha:', error);
      return { detected: false };
    }
  }

  /**
   * WAIT FOR USER to solve captcha manually
   */
  static async waitForManualSolve(page, timeout = 120000) {
    console.log('⏳ Waiting for manual captcha solve...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      await page.waitForTimeout(2000);
      
      const captcha = await this.detectCaptcha(page);
      
      if (!captcha.detected) {
        console.log('✅ Captcha solved!');
        return { success: true };
      }
      
      // Check if user filled captcha
      const hasToken = await page.evaluate(() => {
        const recaptchaResponse = document.querySelector('[name="g-recaptcha-response"]');
        return recaptchaResponse && recaptchaResponse.value.length > 0;
      });
      
      if (hasToken) {
        console.log('✅ Captcha token detected!');
        return { success: true };
      }
    }
    
    return { success: false, error: 'Timeout waiting for captcha solve' };
  }

  /**
   * AUTO-CLICK reCAPTCHA checkbox (v2)
   */
  static async autoClickRecaptcha(page) {
    try {
      console.log('🤖 Auto-clicking reCAPTCHA...');
      
      // Find reCAPTCHA iframe
      const frames = page.frames();
      
      for (const frame of frames) {
        const url = frame.url();
        
        if (url.includes('recaptcha') && url.includes('anchor')) {
          console.log('✓ Found reCAPTCHA anchor frame');
          
          // Click checkbox
          await frame.click('#recaptcha-anchor', { delay: 100 });
          
          console.log('✓ Clicked reCAPTCHA checkbox');
          
          // Wait for verification
          await page.waitForTimeout(3000);
          
          return { success: true };
        }
      }
      
      return { success: false, error: 'reCAPTCHA frame not found' };
    } catch (error) {
      console.error('Error auto-clicking reCAPTCHA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * INJECT anti-captcha headers
   */
  static getAntiCaptchaHeaders() {
    return {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
  }

  /**
   * INJECT anti-captcha cookies
   */
  static getAntiCaptchaCookies(domain = 'facebook.com') {
    return [
      {
        name: 'dpr',
        value: '1',
        domain: `.${domain}`,
        path: '/',
      },
      {
        name: 'wd',
        value: '1920x1080',
        domain: `.${domain}`,
        path: '/',
      },
    ];
  }

  /**
   * PREVENT captcha by warming up session
   */
  static async warmupSession(page) {
    console.log('🔥 Warming up session to prevent captcha...');
    
    try {
      // Visit Facebook homepage first
      await page.goto('https://www.facebook.com', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      
      await page.waitForTimeout(3000);
      
      // Scroll a bit
      await page.evaluate(() => {
        window.scrollBy(0, 300);
      });
      
      await page.waitForTimeout(2000);
      
      // Move mouse around
      await page.mouse.move(100, 100);
      await page.waitForTimeout(500);
      await page.mouse.move(500, 300);
      await page.waitForTimeout(500);
      await page.mouse.move(800, 500);
      
      await page.waitForTimeout(2000);
      
      console.log('✓ Session warmed up');
      
      return { success: true };
    } catch (error) {
      console.error('Error warming up session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * HANDLE captcha if detected
   */
  static async handleCaptcha(page, options = {}) {
    const {
      autoClick = true,
      waitForManual = true,
      timeout = 120000,
    } = options;

    try {
      console.log('🛡️ Handling captcha...');
      
      // Detect captcha type
      const captcha = await this.detectCaptcha(page);
      
      if (!captcha.detected) {
        console.log('✓ No captcha detected');
        return { success: true, handled: false };
      }
      
      console.log('⚠️ Captcha detected:', captcha);
      
      // Try auto-click for reCAPTCHA v2
      if (captcha.hasRecaptcha && autoClick) {
        const clicked = await this.autoClickRecaptcha(page);
        
        if (clicked.success) {
          // Wait and check if solved
          await page.waitForTimeout(5000);
          
          const stillHasCaptcha = await this.detectCaptcha(page);
          
          if (!stillHasCaptcha.detected) {
            console.log('✅ Captcha auto-solved!');
            return { success: true, handled: true, method: 'auto' };
          }
        }
      }
      
      // Wait for manual solve
      if (waitForManual) {
        console.log('⏳ Please solve captcha manually...');
        
        const solved = await this.waitForManualSolve(page, timeout);
        
        if (solved.success) {
          console.log('✅ Captcha manually solved!');
          return { success: true, handled: true, method: 'manual' };
        } else {
          return { success: false, error: 'Captcha not solved within timeout' };
        }
      }
      
      return { success: false, error: 'Captcha detected but not handled' };
    } catch (error) {
      console.error('Error handling captcha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * INJECT captcha bypass scripts
   */
  static getCaptchaBypassScripts() {
    return `
      // Block captcha-related scripts from loading
      (function() {
        const originalAppendChild = Element.prototype.appendChild;
        Element.prototype.appendChild = function(child) {
          if (child.tagName === 'SCRIPT' || child.tagName === 'IFRAME') {
            const src = child.src || '';
            const content = child.innerHTML || '';
            
            // Block known captcha scripts
            if (src.includes('recaptcha') || 
                src.includes('hcaptcha') ||
                src.includes('captcha') ||
                content.includes('recaptcha') ||
                content.includes('hcaptcha')) {
              console.log('🛡️ Blocked captcha script:', src || 'inline');
              return child;
            }
          }
          return originalAppendChild.call(this, child);
        };
      })();
      
      // Override reCAPTCHA API
      window.grecaptcha = {
        ready: function(callback) {
          callback();
        },
        execute: function() {
          return Promise.resolve('fake-token');
        },
        render: function() {
          return 1;
        },
      };
    `;
  }
}

module.exports = CaptchaEvasion;

