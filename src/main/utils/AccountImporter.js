/**
 * Import và parse thông tin tài khoản từ format:
 * PageID|PageName|2FA_Secret|Email|Password|App_Password
 */
class AccountImporter {
  /**
   * Parse một dòng thông tin account
   * @param {string} line - Dòng text
   * @returns {Object|null}
   */
  static parseLine(line) {
    try {
      // Trim và bỏ qua dòng trống
      line = line.trim();
      if (!line) return null;
      
      // Split bằng |
      const parts = line.split('|');
      
      if (parts.length < 5) {
        console.warn('Dòng không đủ thông tin:', line);
        return null;
      }
      
      const [pageId, pageName, twoFASecret, email, password, appPassword] = parts;
      
      return {
        pageId: pageId.trim(),
        pageName: pageName.trim(),
        twoFASecret: twoFASecret.trim(),
        email: email.trim(),
        password: password.trim(),
        appPassword: appPassword ? appPassword.trim() : null,
        raw: line
      };
    } catch (error) {
      console.error('Lỗi parse line:', error);
      return null;
    }
  }
  
  /**
   * Parse nhiều dòng
   * @param {string} text - Text chứa nhiều dòng
   * @returns {Array<Object>}
   */
  static parseMultipleLines(text) {
    const lines = text.split('\n');
    const accounts = [];
    
    for (let i = 0; i < lines.length; i++) {
      const account = this.parseLine(lines[i]);
      if (account) {
        account.lineNumber = i + 1;
        accounts.push(account);
      }
    }
    
    return accounts;
  }
  
  /**
   * Validate account info
   * @param {Object} account
   * @returns {Object} - { valid: boolean, errors: Array<string> }
   */
  static validate(account) {
    const errors = [];
    
    if (!account.email || !account.email.includes('@')) {
      errors.push('Email không hợp lệ');
    }
    
    if (!account.password || account.password.length < 3) {
      errors.push('Password quá ngắn');
    }
    
    if (!account.twoFASecret || account.twoFASecret.length < 16) {
      errors.push('2FA secret không hợp lệ');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Format lại thành string để lưu
   * @param {Object} account
   * @returns {string}
   */
  static format(account) {
    return [
      account.pageId,
      account.pageName,
      account.twoFASecret,
      account.email,
      account.password,
      account.appPassword || ''
    ].join('|');
  }
}

module.exports = AccountImporter;

