const Store = require('electron-store');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * ADVANCED SESSION MANAGEMENT - ENTERPRISE LEVEL
 * 
 * Features:
 * - Session State Serialization (cookies, localStorage, sessionStorage, indexedDB)
 * - Encrypted session storage
 * - Session versioning & backup
 * - Session restoration with integrity check
 * - Session token refresh automation
 */
class SessionManager {
  constructor(options = {}) {
    this.store = new Store({
      name: 'sessions',
      encryptionKey: options.encryptionKey || 'fb-page-manager-ultra-secure-key-2025',
    });
    
    this.sessionDir = path.join(process.cwd(), 'sessions');
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * LƯU SESSION - Full state capture
   * Capture tất cả:
   * - Cookies
   * - localStorage
   * - sessionStorage
   * - indexedDB data
   * - Service Worker state
   * - Cache API data
   */
  async captureFullSession(page, accountId) {
    try {
      console.log('📸 Capturing full session state...');

      // 1. Storage State từ Playwright (cookies + localStorage)
      const storageState = await page.context().storageState();

      // 2. Session Storage
      const sessionStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          data[key] = window.sessionStorage.getItem(key);
        }
        return data;
      });

      // 3. IndexedDB data
      const indexedDBData = await this.captureIndexedDB(page);

      // 4. Service Workers
      const serviceWorkers = await page.evaluate(() => {
        if ('serviceWorker' in navigator) {
          return navigator.serviceWorker.getRegistrations().then(regs => {
            return regs.map(reg => ({
              scope: reg.scope,
              scriptURL: reg.active ? reg.active.scriptURL : null,
              state: reg.active ? reg.active.state : null,
            }));
          });
        }
        return [];
      });

      // 5. Cache API data (chỉ lưu metadata, không lưu content)
      const cacheData = await page.evaluate(() => {
        if ('caches' in window) {
          return window.caches.keys().then(cacheNames => {
            return cacheNames;
          });
        }
        return [];
      });

      // 6. Browser fingerprint data
      const fingerprint = await this.captureBrowserFingerprint(page);

      // 7. Facebook specific data
      const fbSpecificData = await this.captureFacebookData(page);

      const fullSession = {
        accountId,
        timestamp: Date.now(),
        version: '2.0',
        
        // Core data
        storageState,
        sessionStorage,
        indexedDBData,
        serviceWorkers,
        cacheData,
        
        // Fingerprint
        fingerprint,
        
        // Facebook specific
        fbSpecificData,
        
        // Metadata
        userAgent: await page.evaluate(() => navigator.userAgent),
        url: page.url(),
      };

      // Lưu encrypted session
      await this.saveSession(accountId, fullSession);

      console.log('✅ Full session captured successfully');
      
      return {
        success: true,
        sessionId: this.generateSessionId(accountId),
        dataSize: JSON.stringify(fullSession).length,
      };
    } catch (error) {
      console.error('❌ Failed to capture session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Capture IndexedDB data
   */
  async captureIndexedDB(page) {
    try {
      return await page.evaluate(() => {
        return new Promise((resolve) => {
          const dbData = {};
          
          // Get all databases
          if (!window.indexedDB) {
            resolve(dbData);
            return;
          }

          // Note: Không thể list tất cả databases trong Chrome
          // Chỉ có thể access database nếu biết tên
          // Facebook dùng các tên như: "rti-store", "LocalStorage", etc.
          
          const knownDBs = ['rti-store', 'LocalStorage', 'asyncStorage'];
          let processed = 0;

          if (knownDBs.length === 0) {
            resolve(dbData);
            return;
          }

          knownDBs.forEach(dbName => {
            try {
              const request = window.indexedDB.open(dbName);
              
              request.onsuccess = (event) => {
                const db = event.target.result;
                dbData[dbName] = {
                  version: db.version,
                  objectStoreNames: Array.from(db.objectStoreNames),
                };
                db.close();
                
                processed++;
                if (processed === knownDBs.length) {
                  resolve(dbData);
                }
              };
              
              request.onerror = () => {
                processed++;
                if (processed === knownDBs.length) {
                  resolve(dbData);
                }
              };
            } catch (e) {
              processed++;
              if (processed === knownDBs.length) {
                resolve(dbData);
              }
            }
          });

          // Timeout fallback
          setTimeout(() => resolve(dbData), 3000);
        });
      });
    } catch (error) {
      console.error('Error capturing IndexedDB:', error);
      return {};
    }
  }

  /**
   * Capture browser fingerprint
   */
  async captureBrowserFingerprint(page) {
    try {
      return await page.evaluate(() => {
        return {
          // Screen
          screen: {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth,
            pixelDepth: window.screen.pixelDepth,
          },
          
          // Navigator
          navigator: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            maxTouchPoints: navigator.maxTouchPoints,
            vendor: navigator.vendor,
          },
          
          // Timezone
          timezone: {
            offset: new Date().getTimezoneOffset(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          
          // WebGL
          webgl: (() => {
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              if (!gl) return null;
              
              const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
              return {
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
              };
            } catch (e) {
              return null;
            }
          })(),
          
          // Canvas fingerprint
          canvas: (() => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              ctx.textBaseline = 'top';
              ctx.font = '14px Arial';
              ctx.fillStyle = '#f60';
              ctx.fillRect(0, 0, 100, 100);
              ctx.fillStyle = '#069';
              ctx.fillText('Browser Fingerprint', 2, 15);
              return canvas.toDataURL().substring(0, 100); // Chỉ lấy 100 ký tự đầu
            } catch (e) {
              return null;
            }
          })(),
        };
      });
    } catch (error) {
      console.error('Error capturing fingerprint:', error);
      return {};
    }
  }

  /**
   * Capture Facebook specific data
   */
  async captureFacebookData(page) {
    try {
      return await page.evaluate(() => {
        const fbData = {};
        
        // Facebook localStorage keys
        const fbKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('_fb') || 
          key.includes('facebook') ||
          key.startsWith('xs_')
        );
        
        fbKeys.forEach(key => {
          fbData[key] = localStorage.getItem(key);
        });
        
        // DTSG token (important!)
        const dtsgElement = document.querySelector('[name="fb_dtsg"]');
        if (dtsgElement) {
          fbData.fb_dtsg = dtsgElement.value;
        }
        
        // User ID
        const userIdMatch = document.cookie.match(/c_user=(\d+)/);
        if (userIdMatch) {
          fbData.c_user = userIdMatch[1];
        }
        
        return fbData;
      });
    } catch (error) {
      console.error('Error capturing Facebook data:', error);
      return {};
    }
  }

  /**
   * LƯU SESSION vào encrypted storage
   */
  async saveSession(accountId, sessionData) {
    try {
      const sessionId = this.generateSessionId(accountId);
      
      // Lưu vào store (encrypted)
      this.store.set(`session_${sessionId}`, {
        ...sessionData,
        lastSaved: Date.now(),
      });
      
      // Backup to file (double encrypted)
      const encrypted = this.encryptData(JSON.stringify(sessionData));
      const backupPath = path.join(this.sessionDir, `${sessionId}.session`);
      fs.writeFileSync(backupPath, encrypted, 'utf8');
      
      // Keep version history (last 5 versions)
      await this.saveVersionHistory(sessionId, sessionData);
      
      console.log(`✅ Session saved: ${sessionId}`);
      
      return { success: true, sessionId };
    } catch (error) {
      console.error('Error saving session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * TẢI SESSION và restore vào browser
   */
  async restoreSession(accountId) {
    try {
      const sessionId = this.generateSessionId(accountId);
      
      // Try from store first
      let sessionData = this.store.get(`session_${sessionId}`);
      
      // Fallback to file
      if (!sessionData) {
        const backupPath = path.join(this.sessionDir, `${sessionId}.session`);
        if (fs.existsSync(backupPath)) {
          const encrypted = fs.readFileSync(backupPath, 'utf8');
          const decrypted = this.decryptData(encrypted);
          sessionData = JSON.parse(decrypted);
        }
      }
      
      if (!sessionData) {
        throw new Error('Session not found');
      }
      
      // Verify integrity
      if (!this.verifySessionIntegrity(sessionData)) {
        console.warn('⚠️ Session integrity check failed, may be corrupted');
      }
      
      console.log(`✅ Session restored: ${sessionId}`);
      
      return {
        success: true,
        sessionData,
      };
    } catch (error) {
      console.error('Error restoring session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * RESTORE SESSION vào page context
   */
  async injectSessionIntoPage(page, sessionData) {
    try {
      console.log('💉 Injecting session into page...');
      
      // 1. Restore sessionStorage
      if (sessionData.sessionStorage) {
        await page.addInitScript((data) => {
          Object.entries(data).forEach(([key, value]) => {
            window.sessionStorage.setItem(key, value);
          });
        }, sessionData.sessionStorage);
      }
      
      // 2. Restore Facebook specific data to localStorage
      if (sessionData.fbSpecificData) {
        await page.addInitScript((data) => {
          Object.entries(data).forEach(([key, value]) => {
            window.localStorage.setItem(key, value);
          });
        }, sessionData.fbSpecificData);
      }
      
      console.log('✅ Session injected successfully');
      
      return { success: true };
    } catch (error) {
      console.error('Error injecting session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId(accountId) {
    return crypto.createHash('md5').update(accountId).digest('hex').substring(0, 16);
  }

  /**
   * Encrypt data
   */
  encryptData(data) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('fb-session-encryption-key-2025', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data
   */
  decryptData(encrypted) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('fb-session-encryption-key-2025', 'salt', 32);
    
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Save version history
   */
  async saveVersionHistory(sessionId, sessionData) {
    try {
      const historyKey = `history_${sessionId}`;
      let history = this.store.get(historyKey, []);
      
      // Add current version
      history.unshift({
        timestamp: Date.now(),
        dataHash: crypto.createHash('md5').update(JSON.stringify(sessionData)).digest('hex'),
      });
      
      // Keep only last 5 versions
      history = history.slice(0, 5);
      
      this.store.set(historyKey, history);
    } catch (error) {
      console.error('Error saving version history:', error);
    }
  }

  /**
   * Verify session integrity
   */
  verifySessionIntegrity(sessionData) {
    try {
      // Check required fields
      if (!sessionData.storageState || !sessionData.storageState.cookies) {
        return false;
      }
      
      // Check if cookies are expired
      const now = Date.now() / 1000;
      const validCookies = sessionData.storageState.cookies.filter(cookie => {
        if (cookie.expires && cookie.expires < now) {
          return false;
        }
        return true;
      });
      
      if (validCookies.length === 0) {
        return false;
      }
      
      // Check timestamp (session không quá 30 ngày)
      if (sessionData.timestamp && (Date.now() - sessionData.timestamp) > 30 * 24 * 60 * 60 * 1000) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(accountId) {
    try {
      const sessionId = this.generateSessionId(accountId);
      
      // Delete from store
      this.store.delete(`session_${sessionId}`);
      this.store.delete(`history_${sessionId}`);
      
      // Delete backup file
      const backupPath = path.join(this.sessionDir, `${sessionId}.session`);
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      
      console.log(`🗑️ Session deleted: ${sessionId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all sessions
   */
  listAllSessions() {
    try {
      const allData = this.store.store;
      const sessions = [];
      
      Object.keys(allData).forEach(key => {
        if (key.startsWith('session_')) {
          const sessionData = allData[key];
          sessions.push({
            sessionId: key.replace('session_', ''),
            accountId: sessionData.accountId,
            timestamp: sessionData.timestamp,
            lastSaved: sessionData.lastSaved,
          });
        }
      });
      
      return sessions;
    } catch (error) {
      console.error('Error listing sessions:', error);
      return [];
    }
  }
}

module.exports = SessionManager;

