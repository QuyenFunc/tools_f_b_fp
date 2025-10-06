# 🚀 BATCH LOGIN MANAGER - HƯỚNG DẪN SỬ DỤNG

## Tự động đăng nhập hàng loạt tài khoản Facebook với 2FA

---

## 📋 FORMAT CỦA CHUỖI TÀI KHOẢN

```
accountId|password|2faSecret|email|password2|email2
```

### Giải thích từng phần:

1. **accountId**: Facebook User ID (số, ví dụ: 61568434832204)
2. **password**: Mật khẩu đăng nhập
3. **2faSecret**: TOTP secret key (Base32, ví dụ: YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2)
4. **email**: Email đăng nhập chính
5. **password2**: Mật khẩu backup (optional, mặc định = password)
6. **email2**: Email backup (optional, mặc định = email)

### Ví dụ:

```
61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com|Moimedia@@@|chelcabulamoi@smvmail.com
```

---

## 🎯 SỬ DỤNG CƠ BẢN

### Cách 1: Đăng nhập 1 tài khoản

```javascript
const BatchLoginManager = require('./src/main/utils/BatchLoginManager');

const manager = new BatchLoginManager(mainWindow);

// Parse chuỗi
const parseResult = manager.parseAccountString(
  '61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com|Moimedia@@@|chelcabulamoi@smvmail.com'
);

if (parseResult.success) {
  const account = parseResult.account;
  
  // Login
  const result = await manager.loginSingleAccount(account, {
    headless: false,        // Hiện browser
    useProxy: false,        // Không dùng proxy
    skipIfHasSession: true, // Bỏ qua nếu đã có session
  });
  
  if (result.success) {
    console.log(`✅ Đăng nhập thành công: ${result.userName}`);
  }
}
```

### Cách 2: Đăng nhập nhiều tài khoản (BATCH)

```javascript
const batchString = `
61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com|Moimedia@@@|chelcabulamoi@smvmail.com
61568434832205|Password123|ABCDEFGHIJKLMNOP2345|user2@email.com
61568434832206|Password456|QRSTUVWXYZ123456789A|user3@email.com
61568434832207|Password789|BCDEFGHIJKLMNOP34567|user4@email.com
61568434832208|PasswordXYZ|CDEFGHIJKLMNOP456789|user5@email.com
61568434832209|PasswordABC|DEFGHIJKLMNOP5678901|user6@email.com
`;

const result = await manager.loginBatch(batchString, {
  headless: true,              // Chạy ẩn (nhanh hơn)
  useProxy: false,             // Dùng proxy (khuyến nghị)
  skipIfHasSession: true,      // Bỏ qua nếu đã có session
  delayBetweenAccounts: [60000, 120000], // Delay 1-2 phút giữa các accounts
  stopOnError: false,          // Tiếp tục nếu có lỗi
});

console.log(`
Tổng: ${result.total}
Thành công: ${result.successCount}
Thất bại: ${result.failedCount}
`);
```

---

## 💡 TÍNH NĂNG CHÍNH

### ✅ Tự động parse và validate

```javascript
// Parse batch
const parseResult = manager.parseBatchString(batchString);

console.log(`
Total: ${parseResult.total}
Valid: ${parseResult.valid}
Invalid: ${parseResult.invalid}
`);

// Hiện lỗi
parseResult.errors.forEach(err => {
  console.log(`Line ${err.line}: ${err.error}`);
});
```

### ✅ 2FA Automation hoàn toàn

- Tự động detect 2FA page
- Tự động generate TOTP code
- Tự động điền và submit
- Không cần thao tác thủ công

### ✅ Session Persistence tuyệt đối

- Mỗi account có User Data Directory riêng
- Session được lưu vĩnh viễn
- Lần sau không cần đăng nhập lại
- Tắt máy bật lại vẫn đăng nhập được

### ✅ Skip nếu đã có session

```javascript
// Check sessions trước khi login
const accountIds = [
  '61568434832204',
  '61568434832205',
  '61568434832206',
];

const sessions = await manager.verifyAllSessions(accountIds);

sessions.forEach(s => {
  console.log(`${s.accountId}: ${s.hasSession ? '✅ Có session' : '❌ Không có session'}`);
});
```

### ✅ Export results

```javascript
// Export kết quả ra file
manager.exportResults('./batch_login_results.txt');
```

---

## 🔧 TÍCH HỢP VÀO ELECTRON APP

### File: `src/main/main.js`

```javascript
const BatchLoginManager = require('./utils/BatchLoginManager');
const ProxyManager = require('./utils/ProxyManager');

// Khởi tạo
const proxyManager = new ProxyManager();
const batchManager = new BatchLoginManager(mainWindow, {
  proxyManager: proxyManager,
});

// IPC Handler
ipcMain.handle('batch-login', async (event, batchString, options) => {
  try {
    const result = await batchManager.loginBatch(batchString, options);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Parse accounts (để preview trước khi login)
ipcMain.handle('parse-batch', async (event, batchString) => {
  const result = batchManager.parseBatchString(batchString);
  return result;
});

// Verify sessions
ipcMain.handle('verify-sessions', async (event, accountIds) => {
  const result = await batchManager.verifyAllSessions(accountIds);
  return result;
});
```

### File: `src/renderer/app.js`

```javascript
// HTML
<div id="batch-login-section">
  <h2>🚀 Batch Login Manager</h2>
  
  <textarea id="batch-accounts" rows="10" cols="80" placeholder="Nhập accounts (mỗi dòng 1 account)
Format: accountId|password|2faSecret|email|password2|email2

Example:
61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com"></textarea>
  
  <div>
    <label><input type="checkbox" id="batch-headless" checked> Chạy ẩn (headless)</label>
    <label><input type="checkbox" id="batch-proxy"> Dùng proxy</label>
    <label><input type="checkbox" id="batch-skip-session" checked> Bỏ qua nếu có session</label>
  </div>
  
  <button id="parse-batch-btn">1. Parse & Preview</button>
  <button id="batch-login-btn">2. Đăng nhập hàng loạt</button>
  
  <div id="batch-preview"></div>
  <div id="batch-progress"></div>
  <div id="batch-results"></div>
</div>

// JavaScript
document.getElementById('parse-batch-btn').addEventListener('click', async () => {
  const batchString = document.getElementById('batch-accounts').value;
  
  const result = await window.api.invoke('parse-batch', batchString);
  
  const preview = document.getElementById('batch-preview');
  
  if (result.success) {
    preview.innerHTML = `
      <h3>Preview:</h3>
      <p>✅ Valid: ${result.valid} accounts</p>
      <p>❌ Invalid: ${result.invalid} accounts</p>
      
      <h4>Valid Accounts:</h4>
      <ul>
        ${result.accounts.map(acc => `
          <li>
            <strong>${acc.email}</strong> (ID: ${acc.accountId})
            ${acc.twoFASecret ? '🔐 Has 2FA' : ''}
          </li>
        `).join('')}
      </ul>
      
      ${result.errors.length > 0 ? `
        <h4>Errors:</h4>
        <ul>
          ${result.errors.map(err => `
            <li>Line ${err.line}: ${err.error}</li>
          `).join('')}
        </ul>
      ` : ''}
    `;
  } else {
    preview.innerHTML = `<p style="color: red;">❌ Error: ${result.error}</p>`;
  }
});

document.getElementById('batch-login-btn').addEventListener('click', async () => {
  const batchString = document.getElementById('batch-accounts').value;
  const headless = document.getElementById('batch-headless').checked;
  const useProxy = document.getElementById('batch-proxy').checked;
  const skipIfHasSession = document.getElementById('batch-skip-session').checked;
  
  const options = {
    headless,
    useProxy,
    skipIfHasSession,
    delayBetweenAccounts: [60000, 120000], // 1-2 minutes
  };
  
  const progressDiv = document.getElementById('batch-progress');
  progressDiv.innerHTML = '<p>⏳ Đang đăng nhập...</p>';
  
  const result = await window.api.invoke('batch-login', batchString, options);
  
  const resultsDiv = document.getElementById('batch-results');
  
  if (result.success) {
    resultsDiv.innerHTML = `
      <h3>🎉 Hoàn thành!</h3>
      <p>✅ Thành công: ${result.successCount}/${result.total}</p>
      <p>❌ Thất bại: ${result.failedCount}/${result.total}</p>
      
      <h4>Chi tiết:</h4>
      <ul>
        ${result.results.map(r => `
          <li>
            ${r.success ? '✅' : '❌'} ${r.email}
            ${r.success ? `(${r.userName || 'N/A'})` : `- ${r.error}`}
            ${r.skipped ? '(đã có session)' : ''}
          </li>
        `).join('')}
      </ul>
    `;
  } else {
    resultsDiv.innerHTML = `<p style="color: red;">❌ Error: ${result.error}</p>`;
  }
  
  progressDiv.innerHTML = '';
});

// Listen to batch progress
window.api.on('batch-progress', (data) => {
  const progressDiv = document.getElementById('batch-progress');
  progressDiv.innerHTML = `
    <p>⏳ Progress: ${data.current}/${data.total}</p>
    <p>${data.message}</p>
    <p>✅ Success: ${data.successCount} | ❌ Failed: ${data.failedCount}</p>
  `;
});

// Listen to batch logs
window.api.on('batch-log', (log) => {
  console.log(`[${log.type}] ${log.message}`);
});
```

---

## 📊 WORKFLOW HOÀN CHỈNH

### 1. Chuẩn bị accounts

```text
# File: accounts.txt
61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com
61568434832205|Password123|ABCDEFGHIJKLMNOP2345|user2@email.com
61568434832206|Password456|QRSTUVWXYZ123456789A|user3@email.com
61568434832207|Password789|BCDEFGHIJKLMNOP34567|user4@email.com
61568434832208|PasswordXYZ|CDEFGHIJKLMNOP456789|user5@email.com
61568434832209|PasswordABC|DEFGHIJKLMNOP5678901|user6@email.com
```

### 2. Parse và validate

```javascript
const fs = require('fs');
const batchString = fs.readFileSync('./accounts.txt', 'utf8');

const parseResult = manager.parseBatchString(batchString);

console.log(`
✅ Valid: ${parseResult.valid}
❌ Invalid: ${parseResult.invalid}
`);
```

### 3. Login batch (lần đầu)

```javascript
const result = await manager.loginBatch(batchString, {
  headless: true,
  useProxy: true,
  skipIfHasSession: true,
  delayBetweenAccounts: [60000, 120000],
});

console.log(`
Thành công: ${result.successCount}/${result.total}
`);
```

### 4. Verify sessions

```javascript
// Lần sau, check sessions trước
const accountIds = parseResult.accounts.map(a => a.accountId);
const sessions = await manager.verifyAllSessions(accountIds);

// Chỉ login các accounts không có session
const needLogin = sessions.filter(s => !s.hasSession);
console.log(`Cần login lại: ${needLogin.length} accounts`);
```

### 5. Export results

```javascript
manager.exportResults('./results.txt');
```

---

## 🔥 CÁC TÌNH HUỐNG SỬ DỤNG

### Tình huống 1: Đăng nhập lần đầu (6 accounts)

```javascript
const batchString = `
61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com
61568434832205|Password123|ABCDEFGHIJKLMNOP2345|user2@email.com
61568434832206|Password456|QRSTUVWXYZ123456789A|user3@email.com
61568434832207|Password789|BCDEFGHIJKLMNOP34567|user4@email.com
61568434832208|PasswordXYZ|CDEFGHIJKLMNOP456789|user5@email.com
61568434832209|PasswordABC|DEFGHIJKLMNOP5678901|user6@email.com
`;

// Login tất cả
await manager.loginBatch(batchString, {
  headless: true,
  skipIfHasSession: true,
});

// Kết quả: 6 accounts đăng nhập thành công, session được lưu
```

### Tình huống 2: Đăng nhập lại sau khi tắt máy

```javascript
// Chạy lại cùng batch string
await manager.loginBatch(batchString, {
  headless: true,
  skipIfHasSession: true, // ✅ Bỏ qua vì đã có session
});

// Kết quả: Tất cả 6 accounts skip vì đã có session!
```

### Tình huống 3: Thêm 4 accounts mới (total 10)

```javascript
const batchString = `
61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com
61568434832205|Password123|ABCDEFGHIJKLMNOP2345|user2@email.com
61568434832206|Password456|QRSTUVWXYZ123456789A|user3@email.com
61568434832207|Password789|BCDEFGHIJKLMNOP34567|user4@email.com
61568434832208|PasswordXYZ|CDEFGHIJKLMNOP456789|user5@email.com
61568434832209|PasswordABC|DEFGHIJKLMNOP5678901|user6@email.com
61568434832210|NewPass111|EFGHIJKLMNOP67890123|user7@email.com
61568434832211|NewPass222|FGHIJKLMNOP678901234|user8@email.com
61568434832212|NewPass333|GHIJKLMNOP6789012345|user9@email.com
61568434832213|NewPass444|HIJKLMNOP67890123456|user10@email.com
`;

await manager.loginBatch(batchString, {
  headless: true,
  skipIfHasSession: true,
});

// Kết quả:
// - 6 accounts cũ: Skip (có session)
// - 4 accounts mới: Đăng nhập mới
// Total: 10 accounts sẵn sàng sử dụng
```

---

## ⚙️ TÙY CHỌN NÂNG CAO

### Với Proxy

```javascript
const ProxyManager = require('./utils/ProxyManager');
const proxyManager = new ProxyManager();

// Add proxies
proxyManager.addProxy({
  server: 'http://proxy1.com:8080',
  username: 'user',
  password: 'pass',
  type: 'residential',
  country: 'US',
});

// Pass vào manager
const manager = new BatchLoginManager(mainWindow, {
  proxyManager: proxyManager,
});

// Login với proxy
await manager.loginBatch(batchString, {
  useProxy: true, // ✅ Enable proxy
});
```

### Custom delay

```javascript
await manager.loginBatch(batchString, {
  delayBetweenAccounts: [30000, 60000], // 30s - 1 phút
  // hoặc
  delayBetweenAccounts: [120000, 180000], // 2-3 phút (safer)
});
```

### Stop on error

```javascript
await manager.loginBatch(batchString, {
  stopOnError: true, // Dừng ngay nếu có lỗi
});
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

### Lần 1: Đăng nhập ban đầu

```
📋 Parsing batch accounts...
✅ Parsed 6 accounts: 6 valid, 0 invalid

🚀 Bắt đầu đăng nhập 6 accounts...

============================================================
📱 ACCOUNT 1/6
============================================================
🚀 Đang đăng nhập: chelcabula@outlook.com (ID: 61568434832204)
💾 User Data Directory: ./user_data/profile_61568434832204
🔐 Sử dụng 2FA automation...
🔑 Mã 2FA: 123456 (còn 25s)
✅ Đăng nhập thành công với 2FA: Chelca Bula
💾 Đang lưu session...

✅ Thành công: chelcabula@outlook.com

⏳ Chờ 87s trước khi đăng nhập account tiếp theo...

... (tương tự cho 5 accounts còn lại) ...

============================================================
🎉 HOÀN THÀNH BATCH LOGIN
============================================================
✅ Thành công: 6/6
❌ Thất bại: 0/6
```

### Lần 2: Đăng nhập lại (có session)

```
📋 Parsing batch accounts...
✅ Parsed 6 accounts: 6 valid, 0 invalid

🚀 Bắt đầu đăng nhập 6 accounts...

============================================================
📱 ACCOUNT 1/6
============================================================
🚀 Đang đăng nhập: chelcabula@outlook.com (ID: 61568434832204)
✅ Account 61568434832204 đã có session, bỏ qua đăng nhập

✅ Thành công: chelcabula@outlook.com (skipped - có session)

... (tất cả đều skip) ...

============================================================
🎉 HOÀN THÀNH BATCH LOGIN
============================================================
✅ Thành công: 6/6 (all skipped)
❌ Thất bại: 0/6
```

---

## 📚 FAQ

### Q: Có cần đăng nhập lại sau mỗi lần tắt máy không?

**A:** KHÔNG! Session được lưu vĩnh viễn trong User Data Directory. Tắt máy bật lại vẫn giữ nguyên session.

### Q: 2FA có cần thao tác thủ công không?

**A:** KHÔNG! Hệ thống tự động generate TOTP code và điền vào. Hoàn toàn automation.

### Q: Bao lâu nên đăng nhập lại?

**A:** Session Facebook thường tồn tại 30-60 ngày. Sau đó sẽ cần đăng nhập lại.

### Q: Có giới hạn số lượng accounts không?

**A:** Không có giới hạn. Có thể login 10, 50, 100+ accounts.

### Q: Delay giữa các accounts là bao nhiêu?

**A:** Mặc định 1-2 phút. Có thể tùy chỉnh. Khuyến nghị không dưới 30s.

### Q: Có an toàn không?

**A:** CÓ! Sử dụng:
- User Data Directory persistent (như Chrome profile thật)
- Stealth configuration (anti-detection)
- Human behavior simulation
- Proxy support

---

## 🎉 KẾT LUẬN

Với BatchLoginManager, bạn có thể:

✅ **Nhập chuỗi accounts** → Parse automatic

✅ **Đăng nhập tự động** → 2FA automation hoàn toàn

✅ **Session persistence** → Tắt máy bật lại vẫn login được

✅ **Skip nếu có session** → Không waste time

✅ **Batch processing** → 6 accounts, 10 accounts, 100 accounts

✅ **Anti-detection** → Stealth như người thật

---

**Happy Batch Login! 🚀**

