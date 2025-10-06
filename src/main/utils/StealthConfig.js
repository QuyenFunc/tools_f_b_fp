const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * ADVANCED STEALTH CONFIGURATION - MILITARY GRADE 2025
 * 
 * Tích hợp:
 * - Hardware fingerprint spoofing
 * - Canvas/WebGL fingerprinting bypass
 * - Audio context fingerprinting evasion
 * - WebRTC IP leak blocking
 * - CDP Detection bypass
 * - JavaScript engine fingerprinting
 */
class StealthConfig {
  /**
   * Tạo cấu hình stealth hoàn chỉnh cho browser
   * @param {Object} options - Tùy chọn cấu hình
   * @returns {Object} - Launch args và context options
   */
  static getStealthConfig(options = {}) {
    const {
      userDataDir = null,
      proxy = null,
      timezone = null,
      locale = 'en-US',
      geolocation = null,
      deviceType = 'desktop' // desktop, mobile
    } = options;

    // ARGS CHO CHROME - ULTRA STEALTH 2025
    const args = [
      // CRITICAL: Disable automation detection
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--disable-automation',
      
      // Hide Chrome DevTools Protocol
      '--disable-features=IsolateOrigins,site-per-process,VizDisplayCompositor',
      
      // Performance & stability
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      
      // Anti-fingerprinting
      '--disable-web-security',
      '--disable-site-isolation-trials',
      '--disable-ipc-flooding-protection',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-networking',
      
      // GPU & Canvas protection
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-gpu-compositing',
      '--use-gl=swiftshader',
      
      // WebRTC leak prevention
      '--enforce-webrtc-ip-permission-check',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      
      // Audio & media
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      
      // Memory & resource
      '--disable-background-timer-throttling',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      
      // Network
      '--disable-domain-reliability',
      '--disable-component-update',
      '--disable-client-side-phishing-detection',
      
      // Notifications & popups
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-default-apps',
      
      // Extensions & plugins
      '--disable-extensions-except',
      '--disable-plugins-discovery',
      
      // Privacy
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--disable-logging',
      '--log-level=3',
      '--silent-debugger-extension-api',
      
      // Window & display
      '--window-position=0,0',
      '--disable-infobars',
      
      // Critical for NOT showing automation bar
      '--disable-blink-features=AutomationControlled',
    ];

    // Proxy configuration
    if (proxy) {
      if (proxy.server) {
        args.push(`--proxy-server=${proxy.server}`);
      }
      if (proxy.bypass) {
        args.push(`--proxy-bypass-list=${proxy.bypass}`);
      }
    }

    // CONTEXT OPTIONS - Browser context stealth
    const contextOptions = {
      viewport: deviceType === 'mobile' 
        ? { width: 375, height: 812 } 
        : { width: 1920, height: 1080 },
      
      // User agent - Latest Chrome
      userAgent: this.generateUserAgent(deviceType),
      
      // Locale & timezone
      locale: locale,
      timezoneId: timezone || this.getTimezoneFromProxy(proxy),
      
      // Geolocation (chỉ thêm nếu có)
      ...(geolocation ? { geolocation } : {}),
      
      // Permissions
      permissions: ['geolocation', 'notifications'],
      
      // Extra HTTP headers
      extraHTTPHeaders: {
        'Accept-Language': `${locale},en;q=0.9`,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      
      // Color scheme
      colorScheme: 'light',
      
      // Device scale factor
      deviceScaleFactor: 1,
      
      // Screen size (for screen.width/height)
      screen: deviceType === 'mobile'
        ? { width: 375, height: 812 }
        : { width: 1920, height: 1080 },
    };

    return { args, contextOptions };
  }

  /**
   * Generate realistic User-Agent
   */
  static generateUserAgent(deviceType = 'desktop') {
    const chromeVersion = '131.0.0.0'; // Latest 2025
    
    if (deviceType === 'mobile') {
      return `Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1`;
    }
    
    const platforms = [
      'Windows NT 10.0; Win64; x64',
      'Macintosh; Intel Mac OS X 10_15_7',
      'X11; Linux x86_64',
    ];
    
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  }

  /**
   * Get timezone từ proxy location
   */
  static getTimezoneFromProxy(proxy) {
    if (!proxy || !proxy.country) {
      return 'America/New_York'; // Default
    }
    
    // Map country -> timezone
    const timezoneMap = {
      'US': 'America/New_York',
      'UK': 'Europe/London',
      'VN': 'Asia/Ho_Chi_Minh',
      'SG': 'Asia/Singapore',
      'JP': 'Asia/Tokyo',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'AU': 'Australia/Sydney',
      'BR': 'America/Sao_Paulo',
      'CA': 'America/Toronto',
    };
    
    return timezoneMap[proxy.country] || 'America/New_York';
  }

  /**
   * INJECTION SCRIPTS - Inject vào page để bypass detection
   */
  static getStealthInjectionScripts() {
    return {
      // Script 1: Hide webdriver - ULTRA VERSION
      hideWebdriver: `
        // Delete webdriver property completely
        delete Object.getPrototypeOf(navigator).webdriver;
        
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true,
        });
        
        // Override toString to hide traces
        const originalToString = Function.prototype.toString;
        Function.prototype.toString = function() {
          if (this === navigator.webdriver) {
            return 'undefined';
          }
          return originalToString.call(this);
        };
      `,

      // Script 2: Chrome runtime
      addChromeRuntime: `
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {},
        };
      `,

      // Script 3: Permissions API
      mockPermissions: `
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      `,

      // Script 4: Plugin array
      mockPlugins: `
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin"
            },
            {
              0: {type: "application/pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format",
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              length: 1,
              name: "Chrome PDF Viewer"
            },
            {
              0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
              1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
              description: "",
              filename: "internal-nacl-plugin",
              length: 2,
              name: "Native Client"
            }
          ],
        });
      `,

      // Script 5: Languages
      mockLanguages: `
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'vi'],
        });
      `,

      // Script 6: Canvas fingerprinting protection
      canvasProtection: `
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        // Add tiny random noise to canvas
        const addNoise = (imageData) => {
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Thêm noise rất nhỏ (không thể nhìn thấy)
            const noise = Math.floor(Math.random() * 3) - 1;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
          }
          return imageData;
        };

        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
          const imageData = originalGetImageData.apply(this, args);
          return addNoise(imageData);
        };

        HTMLCanvasElement.prototype.toDataURL = function(...args) {
          // Get image data, add noise, then convert
          const ctx = this.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            addNoise(imageData);
            ctx.putImageData(imageData, 0, 0);
          }
          return originalToDataURL.apply(this, args);
        };
      `,

      // Script 7: WebGL fingerprinting protection
      webglProtection: `
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // Spoof vendor & renderer
          if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
            return 'Intel Inc.';
          }
          if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
            return 'Intel Iris OpenGL Engine';
          }
          return getParameter.apply(this, arguments);
        };

        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return 'Intel Inc.';
          }
          if (parameter === 37446) {
            return 'Intel Iris OpenGL Engine';
          }
          return getParameter2.apply(this, arguments);
        };
      `,

      // Script 8: Audio context fingerprinting protection
      audioProtection: `
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const origCreateDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;
          AudioContext.prototype.createDynamicsCompressor = function() {
            const compressor = origCreateDynamicsCompressor.call(this);
            
            // Add tiny random variation
            const addNoise = (value) => value + (Math.random() * 0.0001 - 0.00005);
            
            const origGetValue = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value').get;
            Object.defineProperty(AudioParam.prototype, 'value', {
              get: function() {
                const value = origGetValue.call(this);
                return addNoise(value);
              },
            });
            
            return compressor;
          };
        }
      `,

      // Script 9: Hardware concurrency spoofing
      hardwareSpoof: `
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8, // Giả lập CPU 8 cores
        });
      `,

      // Script 10: Device memory spoofing
      memorySpoof: `
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8, // Giả lập 8GB RAM
        });
      `,

      // Script 11: Screen resolution protection
      screenProtection: `
        Object.defineProperty(screen, 'availWidth', {
          get: () => 1920,
        });
        Object.defineProperty(screen, 'availHeight', {
          get: () => 1040,
        });
        Object.defineProperty(screen, 'width', {
          get: () => 1920,
        });
        Object.defineProperty(screen, 'height', {
          get: () => 1080,
        });
      `,

      // Script 12: Battery API blocking
      batteryBlock: `
        if (navigator.getBattery) {
          navigator.getBattery = () => Promise.reject(new Error('Battery API blocked'));
        }
      `,

      // Script 13: Media devices protection
      mediaDevicesProtection: `
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const origEnumerate = navigator.mediaDevices.enumerateDevices;
          navigator.mediaDevices.enumerateDevices = function() {
            return origEnumerate.call(this).then(devices => {
              // Return generic devices
              return [
                { deviceId: 'default', kind: 'audioinput', label: '', groupId: 'group1' },
                { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'group1' },
                { deviceId: 'default', kind: 'videoinput', label: '', groupId: 'group2' },
              ];
            });
          };
        }
      `,

      // Script 14: Hide automation properties
      hideAutomationProperties: `
        // Remove all automation-related properties
        const automationProps = [
          '__webdriver_evaluate',
          '__selenium_evaluate',
          '__webdriver_script_function',
          '__webdriver_script_func',
          '__webdriver_script_fn',
          '__fxdriver_evaluate',
          '__driver_unwrapped',
          '__webdriver_unwrapped',
          '__driver_evaluate',
          '__selenium_unwrapped',
          '__fxdriver_unwrapped',
          '_Selenium_IDE_Recorder',
          '_selenium',
          'calledSelenium',
          '$cdc_asdjflasutopfhvcZLmcfl_',
          '$chrome_asyncScriptInfo',
          '__$webdriverAsyncExecutor',
        ];
        
        automationProps.forEach(prop => {
          delete window[prop];
          delete document[prop];
        });
        
        // Override document.documentElement.getAttribute
        const originalGetAttribute = document.documentElement.getAttribute;
        document.documentElement.getAttribute = function(name) {
          if (name === 'webdriver' || name === 'driver' || name === 'selenium') {
            return null;
          }
          return originalGetAttribute.call(this, name);
        };
      `,

      // Script 15: Override CDP Runtime.enable
      overrideCDP: `
        // Block CDP Runtime detection
        if (window.chrome && window.chrome.runtime) {
          const originalSendMessage = window.chrome.runtime.sendMessage;
          window.chrome.runtime.sendMessage = function(...args) {
            // Block CDP calls
            const message = args[0];
            if (message && typeof message === 'object') {
              if (message.method === 'Runtime.enable' || 
                  message.method === 'Debugger.enable' ||
                  message.method === 'Network.enable') {
                return Promise.resolve();
              }
            }
            return originalSendMessage.apply(this, args);
          };
        }
      `,

      // Script 16: Fake notification permissions
      fakeNotifications: `
        const originalQuery = window.Notification.requestPermission;
        window.Notification.requestPermission = function() {
          return Promise.resolve('default');
        };
        
        Object.defineProperty(Notification, 'permission', {
          get: () => 'default',
        });
      `,

      // Script 17: Randomize performance timing
      randomizePerformance: `
        // Add small random delays to performance timing
        const originalNow = Performance.prototype.now;
        Performance.prototype.now = function() {
          const realTime = originalNow.call(this);
          const noise = Math.random() * 0.1; // 0-0.1ms noise
          return realTime + noise;
        };
      `,
    };
  }

  /**
   * Inject tất cả stealth scripts vào page
   */
  static async injectStealthScripts(page) {
    const scripts = this.getStealthInjectionScripts();
    
    // Inject tất cả scripts TRƯỚC KHI page load
    const allScripts = Object.values(scripts).join('\n\n');
    
    await page.addInitScript(allScripts);
    
    console.log('✓ Injected all stealth scripts');
  }

  /**
   * Tạo User Data Directory cho persistent context
   */
  static createUserDataDir(accountId) {
    const baseDir = path.join(process.cwd(), 'user_data');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    const userDataDir = path.join(baseDir, `profile_${accountId}`);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    return userDataDir;
  }

  /**
   * Generate unique device fingerprint
   */
  static generateDeviceFingerprint(accountId) {
    const seed = `${accountId}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    return {
      id: hash.substring(0, 16),
      hardwareConcurrency: 4 + (parseInt(hash[0], 16) % 8), // 4-12 cores
      deviceMemory: 4 + (parseInt(hash[1], 16) % 4) * 2, // 4-12 GB
      screenWidth: 1920,
      screenHeight: 1080,
      colorDepth: 24,
      platform: ['Win32', 'MacIntel', 'Linux x86_64'][parseInt(hash[2], 16) % 3],
    };
  }
}

module.exports = StealthConfig;

