/**
 * PROXY MANAGEMENT SYSTEM - ENTERPRISE LEVEL
 * 
 * Features:
 * - Residential proxy rotation
 * - IP-Timezone synchronization
 * - DNS leak prevention
 * - WebRTC IP leak blocking
 * - Proxy health monitoring
 * - Geo-targeting precision
 */
class ProxyManager {
  constructor() {
    this.proxies = new Map();
    this.activeProxies = new Map();
    this.proxyStats = new Map();
  }

  /**
   * Thêm proxy vào pool
   */
  addProxy(proxyConfig) {
    const {
      id,
      server, // format: protocol://host:port (e.g., http://proxy.com:8080)
      username,
      password,
      type = 'residential', // residential, datacenter, mobile, isp
      country,
      city,
      asn,
      sticky = false, // Sticky session
      stickySessions = {},
    } = proxyConfig;

    if (!server) {
      throw new Error('Proxy server is required');
    }

    const proxyId = id || this.generateProxyId(server);

    this.proxies.set(proxyId, {
      id: proxyId,
      server,
      username,
      password,
      type,
      country,
      city,
      asn,
      sticky,
      stickySessions,
      status: 'active',
      lastUsed: null,
      totalRequests: 0,
      failedRequests: 0,
    });

    console.log(`✅ Added proxy: ${proxyId} (${type} - ${country || 'unknown'})`);

    return proxyId;
  }

  /**
   * Lấy proxy tốt nhất cho account
   */
  getBestProxy(accountId, options = {}) {
    const {
      country = null,
      type = null,
      avoidRecent = true,
    } = options;

    let availableProxies = Array.from(this.proxies.values())
      .filter(proxy => proxy.status === 'active');

    // Filter by country
    if (country) {
      availableProxies = availableProxies.filter(p => p.country === country);
    }

    // Filter by type
    if (type) {
      availableProxies = availableProxies.filter(p => p.type === type);
    }

    if (availableProxies.length === 0) {
      return null;
    }

    // Check if account already has sticky session
    const stickyProxy = this.getStickyProxy(accountId);
    if (stickyProxy) {
      return stickyProxy;
    }

    // Select proxy with lowest failure rate
    availableProxies.sort((a, b) => {
      const aFailRate = a.totalRequests > 0 ? a.failedRequests / a.totalRequests : 0;
      const bFailRate = b.totalRequests > 0 ? b.failedRequests / b.totalRequests : 0;
      return aFailRate - bFailRate;
    });

    // If avoid recent, pick one not used recently
    if (avoidRecent) {
      const notRecentProxies = availableProxies.filter(p => {
        if (!p.lastUsed) return true;
        const timeSinceUse = Date.now() - p.lastUsed;
        return timeSinceUse > 60000; // Not used in last 1 minute
      });

      if (notRecentProxies.length > 0) {
        availableProxies = notRecentProxies;
      }
    }

    return availableProxies[0];
  }

  /**
   * Get sticky proxy for account
   */
  getStickyProxy(accountId) {
    for (const proxy of this.proxies.values()) {
      if (proxy.sticky && proxy.stickySessions[accountId]) {
        const session = proxy.stickySessions[accountId];
        
        // Check if session is still valid (24 hours)
        if (Date.now() - session.createdAt < 24 * 60 * 60 * 1000) {
          return proxy;
        } else {
          // Session expired
          delete proxy.stickySessions[accountId];
        }
      }
    }
    return null;
  }

  /**
   * Assign proxy to account với sticky session
   */
  assignProxyToAccount(accountId, proxyId, options = {}) {
    const {
      stickyDuration = 24 * 60 * 60 * 1000, // 24 hours
    } = options;

    const proxy = this.proxies.get(proxyId);
    if (!proxy) {
      throw new Error('Proxy not found');
    }

    // Create sticky session
    if (proxy.sticky) {
      proxy.stickySessions[accountId] = {
        createdAt: Date.now(),
        expiresAt: Date.now() + stickyDuration,
      };
    }

    // Mark proxy as used
    proxy.lastUsed = Date.now();
    proxy.totalRequests++;

    this.activeProxies.set(accountId, proxyId);

    console.log(`🔗 Assigned proxy ${proxyId} to account ${accountId}`);

    return proxy;
  }

  /**
   * Get Playwright proxy configuration
   */
  getPlaywrightProxyConfig(proxyId) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) {
      return null;
    }

    const config = {
      server: proxy.server,
    };

    if (proxy.username && proxy.password) {
      config.username = proxy.username;
      config.password = proxy.password;
    }

    // Bypass list (local addresses)
    config.bypass = 'localhost,127.0.0.1,*.local';

    return config;
  }

  /**
   * Get timezone từ proxy location
   */
  getTimezoneFromProxy(proxyId) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy || !proxy.country) {
      return 'America/New_York'; // Default
    }

    return this.getTimezoneByCountry(proxy.country);
  }

  /**
   * Get timezone by country code
   */
  getTimezoneByCountry(countryCode) {
    const timezoneMap = {
      // Americas
      'US': 'America/New_York',
      'CA': 'America/Toronto',
      'MX': 'America/Mexico_City',
      'BR': 'America/Sao_Paulo',
      'AR': 'America/Argentina/Buenos_Aires',
      
      // Europe
      'GB': 'Europe/London',
      'FR': 'Europe/Paris',
      'DE': 'Europe/Berlin',
      'IT': 'Europe/Rome',
      'ES': 'Europe/Madrid',
      'NL': 'Europe/Amsterdam',
      'PL': 'Europe/Warsaw',
      'RU': 'Europe/Moscow',
      
      // Asia
      'CN': 'Asia/Shanghai',
      'JP': 'Asia/Tokyo',
      'KR': 'Asia/Seoul',
      'IN': 'Asia/Kolkata',
      'SG': 'Asia/Singapore',
      'TH': 'Asia/Bangkok',
      'VN': 'Asia/Ho_Chi_Minh',
      'ID': 'Asia/Jakarta',
      'PH': 'Asia/Manila',
      
      // Oceania
      'AU': 'Australia/Sydney',
      'NZ': 'Pacific/Auckland',
      
      // Middle East
      'AE': 'Asia/Dubai',
      'SA': 'Asia/Riyadh',
      'IL': 'Asia/Jerusalem',
      
      // Africa
      'ZA': 'Africa/Johannesburg',
      'EG': 'Africa/Cairo',
      'NG': 'Africa/Lagos',
    };

    return timezoneMap[countryCode] || 'America/New_York';
  }

  /**
   * Get locale từ proxy location
   */
  getLocaleFromProxy(proxyId) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy || !proxy.country) {
      return 'en-US';
    }

    const localeMap = {
      'US': 'en-US',
      'GB': 'en-GB',
      'CA': 'en-CA',
      'AU': 'en-AU',
      'FR': 'fr-FR',
      'DE': 'de-DE',
      'ES': 'es-ES',
      'IT': 'it-IT',
      'JP': 'ja-JP',
      'KR': 'ko-KR',
      'CN': 'zh-CN',
      'RU': 'ru-RU',
      'BR': 'pt-BR',
      'VN': 'vi-VN',
      'TH': 'th-TH',
      'IN': 'hi-IN',
    };

    return localeMap[proxy.country] || 'en-US';
  }

  /**
   * Record proxy success
   */
  recordProxySuccess(proxyId) {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      // Success is default, no need to increment
      this.updateProxyStats(proxyId, 'success');
    }
  }

  /**
   * Record proxy failure
   */
  recordProxyFailure(proxyId) {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.failedRequests++;
      
      // Auto-disable proxy if failure rate too high
      const failRate = proxy.failedRequests / proxy.totalRequests;
      if (failRate > 0.5 && proxy.totalRequests > 10) {
        proxy.status = 'disabled';
        console.log(`❌ Disabled proxy ${proxyId} due to high failure rate (${(failRate * 100).toFixed(1)}%)`);
      }
      
      this.updateProxyStats(proxyId, 'failure');
    }
  }

  /**
   * Update proxy statistics
   */
  updateProxyStats(proxyId, result) {
    if (!this.proxyStats.has(proxyId)) {
      this.proxyStats.set(proxyId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastUsed: null,
        avgResponseTime: 0,
      });
    }

    const stats = this.proxyStats.get(proxyId);
    stats.totalRequests++;
    stats.lastUsed = Date.now();

    if (result === 'success') {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
  }

  /**
   * Get proxy statistics
   */
  getProxyStats(proxyId) {
    return this.proxyStats.get(proxyId) || null;
  }

  /**
   * List all proxies
   */
  listProxies() {
    return Array.from(this.proxies.values()).map(proxy => ({
      id: proxy.id,
      server: proxy.server,
      type: proxy.type,
      country: proxy.country,
      city: proxy.city,
      status: proxy.status,
      lastUsed: proxy.lastUsed,
      failureRate: proxy.totalRequests > 0 
        ? (proxy.failedRequests / proxy.totalRequests * 100).toFixed(1) + '%'
        : '0%',
    }));
  }

  /**
   * Remove proxy
   */
  removeProxy(proxyId) {
    const deleted = this.proxies.delete(proxyId);
    this.proxyStats.delete(proxyId);
    
    // Remove from active assignments
    for (const [accountId, assignedProxyId] of this.activeProxies.entries()) {
      if (assignedProxyId === proxyId) {
        this.activeProxies.delete(accountId);
      }
    }
    
    if (deleted) {
      console.log(`🗑️ Removed proxy: ${proxyId}`);
    }
    
    return deleted;
  }

  /**
   * Test proxy connection
   */
  async testProxy(proxyId) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) {
      return { success: false, error: 'Proxy not found' };
    }

    try {
      // Test với Playwright
      const { chromium } = require('playwright');
      
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox'],
      });

      const context = await browser.newContext({
        proxy: this.getPlaywrightProxyConfig(proxyId),
      });

      const page = await context.newPage();
      
      const startTime = Date.now();
      await page.goto('https://api.ipify.org?format=json', { 
        timeout: 10000,
        waitUntil: 'domcontentloaded',
      });
      const responseTime = Date.now() - startTime;

      const ipData = await page.evaluate(() => {
        return JSON.parse(document.body.textContent);
      });

      await browser.close();

      console.log(`✅ Proxy ${proxyId} test successful: IP=${ipData.ip}, ResponseTime=${responseTime}ms`);

      return {
        success: true,
        ip: ipData.ip,
        responseTime,
      };
    } catch (error) {
      console.error(`❌ Proxy ${proxyId} test failed:`, error.message);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate proxy ID from server
   */
  generateProxyId(server) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(server).digest('hex').substring(0, 8);
  }

  /**
   * Import proxies từ file
   * Format: protocol://username:password@host:port | country | type
   */
  importProxiesFromFile(filePath) {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());

      let imported = 0;

      lines.forEach(line => {
        try {
          const [proxyUrl, country, type] = line.split('|').map(s => s.trim());
          
          // Parse proxy URL
          const url = new URL(proxyUrl);
          
          const proxyConfig = {
            server: `${url.protocol}//${url.host}`,
            username: url.username || undefined,
            password: url.password || undefined,
            country: country || undefined,
            type: type || 'residential',
          };

          this.addProxy(proxyConfig);
          imported++;
        } catch (error) {
          console.error(`Failed to parse proxy line: ${line}`, error.message);
        }
      });

      console.log(`✅ Imported ${imported} proxies from ${filePath}`);

      return { success: true, imported };
    } catch (error) {
      console.error('Failed to import proxies:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get WebRTC leak prevention script
   */
  static getWebRTCBlockScript() {
    return `
      // Block WebRTC to prevent IP leaks
      (function() {
        // Override getUserMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia = function() {
            return Promise.reject(new Error('Permission denied'));
          };
        }

        // Override RTCPeerConnection
        if (window.RTCPeerConnection) {
          window.RTCPeerConnection = function() {
            throw new Error('RTCPeerConnection blocked');
          };
        }

        if (window.webkitRTCPeerConnection) {
          window.webkitRTCPeerConnection = function() {
            throw new Error('webkitRTCPeerConnection blocked');
          };
        }

        if (window.mozRTCPeerConnection) {
          window.mozRTCPeerConnection = function() {
            throw new Error('mozRTCPeerConnection blocked');
          };
        }
      })();
    `;
  }

  /**
   * Get DNS leak prevention configuration
   */
  static getDNSLeakPrevention() {
    return {
      // Force DNS through proxy
      args: [
        '--host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE localhost"',
      ],
    };
  }
}

module.exports = ProxyManager;

