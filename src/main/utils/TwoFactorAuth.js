const crypto = require('crypto');

/**
 * Generator TOTP (Time-based One-Time Password) cho Facebook 2FA
 * Tương thích với Google Authenticator
 */
class TwoFactorAuth {
  /**
   * Tạo mã TOTP 6 chữ số từ secret key
   * @param {string} secret - Secret key từ Facebook (base32)
   * @returns {string} - Mã 6 chữ số
   */
  static generateTOTP(secret) {
    try {
      // Chuyển secret từ base32 sang buffer
      const key = this.base32Decode(secret);
      
      // Lấy timestamp hiện tại (30 giây 1 chu kỳ)
      const epoch = Math.floor(Date.now() / 1000);
      const time = Math.floor(epoch / 30);
      
      // Chuyển time thành buffer 8 bytes
      const timeBuffer = Buffer.alloc(8);
      let timeValue = time;
      for (let i = 7; i >= 0; i--) {
        timeBuffer[i] = timeValue & 0xff;
        timeValue = timeValue >> 8;
      }
      
      // Tính HMAC-SHA1
      const hmac = crypto.createHmac('sha1', key);
      hmac.update(timeBuffer);
      const hmacResult = hmac.digest();
      
      // Dynamic truncation
      const offset = hmacResult[hmacResult.length - 1] & 0x0f;
      const code = (
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff)
      );
      
      // Lấy 6 chữ số cuối
      const otp = (code % 1000000).toString().padStart(6, '0');
      
      return otp;
    } catch (error) {
      console.error('Lỗi tạo TOTP:', error);
      throw new Error('Không thể tạo mã 2FA: ' + error.message);
    }
  }
  
  /**
   * Decode base32 string thành buffer
   * @param {string} base32 - String base32
   * @returns {Buffer}
   */
  static base32Decode(base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const base32Lookup = {};
    for (let i = 0; i < base32Chars.length; i++) {
      base32Lookup[base32Chars[i]] = i;
    }
    
    // Xóa khoảng trắng và chuyển uppercase
    base32 = base32.replace(/\s/g, '').toUpperCase();
    
    const output = [];
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < base32.length; i++) {
      const char = base32[i];
      if (char === '=') break;
      
      value = (value << 5) | base32Lookup[char];
      bits += 5;
      
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    
    return Buffer.from(output);
  }
  
  /**
   * Kiểm tra secret key có hợp lệ không
   * @param {string} secret
   * @returns {boolean}
   */
  static isValidSecret(secret) {
    try {
      // Kiểm tra format base32
      const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
      const base32Regex = /^[A-Z2-7]+=*$/;
      
      if (!base32Regex.test(cleanSecret)) {
        return false;
      }
      
      // Thử generate code
      this.generateTOTP(secret);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Lấy thời gian còn lại của mã hiện tại (giây)
   * @returns {number}
   */
  static getTimeRemaining() {
    const epoch = Math.floor(Date.now() / 1000);
    return 30 - (epoch % 30);
  }
}

module.exports = TwoFactorAuth;

