# 🚀 QUICK START GUIDE

## Hướng dẫn nhanh sử dụng Advanced Features

---

## 📦 CÀI ĐẶT

```bash
# Install dependencies
npm install
```

**Dependencies đã có:**
- ✅ playwright
- ✅ electron-store
- ✅ electron

---

## 🎯 SỬ DỤNG CƠ BẢN

### 1. Setup Proxy (Optional)

**Tạo file `proxies.txt`:**
```text
http://user1:pass1@proxy1.com:8080 | US | residential
http://user2:pass2@proxy2.com:8080 | UK | residential
socks5://user3:pass3@proxy3.com:1080 | VN | mobile
```

**Import proxies:**
```javascript
const ProxyManager = require('./src/main/utils/ProxyManager');
const proxyManager = new ProxyManager();

proxyManager.importProxiesFromFile('./proxies.txt');
```

### 2. Login Account Đầu Tiên

```javascript
const FacebookAdvanced = require('./src/main/automation/FacebookAdvanced');
const AccountLifecycle = require('./src/main/utils/AccountLifecycle');

// Setup lifecycle
const lifecycle = new AccountLifecycle();
lifecycle.createAccountProfile('my_account_001');

// Setup Facebook automation
const fb = new FacebookAdvanced(mainWindow, {
  accountId: 'my_account_001',
  proxyManager: proxyManager,  // Optional
  useProxy: true,              // Optional
  proxyId: 'proxy_001',        // Optional
});

// Login (browser sẽ hiện ra)
const result = await fb.login('your_email@example.com', 'your_password', false);

if (result.success) {
  console.log(`✅ Logged in as: ${result.userName}`);
  
  // Session đã tự động lưu!
  // User data directory: ./user_data/profile_my_account_001
}
```

### 3. Login Lần Sau (từ Session)

```javascript
// Lần sau KHÔNG cần email/password
const fb = new FacebookAdvanced(mainWindow, {
  accountId: 'my_account_001',
  useProxy: true,
});

// Login từ session đã lưu (headless mode)
const result = await fb.loginWithSession(true);

if (result.success) {
  console.log('✅ Logged in from session');
} else {
  console.log('❌ Session expired, need to re-login');
}
```

---

## 💡 USE CASES

### Use Case 1: Warming Account Mới

```javascript
const lifecycle = new AccountLifecycle();

// Create profile
lifecycle.createAccountProfile('new_account_001');

// Get warming strategy
const strategy = lifecycle.getWarmingStrategy('new_account_001');

console.log(`
Phase: ${strategy.phase}
Daily actions limit: ${strategy.dailyActions}
Session duration: ${strategy.sessionDuration} minutes
Actions per session: ${strategy.actionsPerSession}
`);

// Follow strategy!
for (let i = 0; i < strategy.actionsPerSession; i++) {
  // Perform action với human behavior
  await HumanBehavior.humanDelay(30000, 60000); // Wait 30-60s
  
  // Do action here...
  
  // Update lifecycle
  lifecycle.updateActivity('new_account_001', 'like');
}
```

### Use Case 2: Multi-Account Automation

```javascript
const accounts = [
  { id: 'acc_001', email: 'user1@email.com', password: 'pass1' },
  { id: 'acc_002', email: 'user2@email.com', password: 'pass2' },
  { id: 'acc_003', email: 'user3@email.com', password: 'pass3' },
];

for (const account of accounts) {
  // Check if can perform action
  const check = lifecycle.canPerformAction(account.id);
  
  if (!check.allowed) {
    console.log(`${account.id}: ${check.reason}`);
    continue;
  }
  
  // Login from session
  const fb = new FacebookAdvanced(mainWindow, {
    accountId: account.id,
    useProxy: true,
  });
  
  const result = await fb.loginWithSession(true); // headless
  
  if (result.success) {
    // Perform actions
    await performActions(fb);
    
    // Close
    await fb.close();
  }
  
  // Delay before next account
  await HumanBehavior.humanDelay(60000, 120000); // 1-2 minutes
}
```

### Use Case 3: Safe Automation với Gating

```javascript
const HumanBehavior = require('./src/main/utils/HumanBehavior');

async function safeAutomation(accountId, action) {
  // Check 1: Can perform action?
  const check = lifecycle.canPerformAction(accountId, action);
  if (!check.allowed) {
    throw new Error(check.reason);
  }
  
  // Check 2: Is optimal time?
  const optimalTime = lifecycle.getOptimalActivityTime(accountId);
  if (optimalTime > new Date()) {
    throw new Error(`Wait until ${optimalTime.toLocaleString()}`);
  }
  
  // Check 3: Get warming strategy
  const strategy = lifecycle.getWarmingStrategy(accountId);
  const actionsToday = lifecycle.getActionsTodayCount(accountId);
  
  if (actionsToday >= strategy.dailyActions) {
    throw new Error('Daily limit reached');
  }
  
  // Perform action với human behavior
  await HumanBehavior.humanDelay(5000, 10000);
  
  // ... do action ...
  
  // Update lifecycle
  lifecycle.updateActivity(accountId, action);
  
  console.log(`✅ Action completed: ${actionsToday + 1}/${strategy.dailyActions}`);
}

// Usage
try {
  await safeAutomation('acc_001', 'post');
} catch (error) {
  console.log(`Cannot perform action: ${error.message}`);
}
```

---

## 📊 MONITORING

### Check Account Health

```javascript
const profile = lifecycle.getAccountProfile('acc_001');

console.log(`
Account: ${profile.accountId}
Age: ${profile.age} days
Status: ${profile.health.status}

Scores:
- Reputation: ${profile.reputation}/100
- Trust: ${profile.trustScore}/100
- Risk: ${profile.riskScore}/100 ${profile.riskScore > 70 ? '⚠️ HIGH RISK' : '✅'}

Activity:
- Total logins: ${profile.totalLogins}
- Total actions: ${profile.totalActions}
- Posts: ${profile.totalPosts}
- Comments: ${profile.totalComments}
- Likes: ${profile.totalLikes}

Health:
- Warnings: ${profile.health.warnings}
- Checkpoints: ${profile.health.checkpoints}
- Consecutive successful logins: ${profile.health.consecutiveSuccessfulLogins}
`);
```

### Monitor All Accounts

```javascript
const accounts = lifecycle.listAllAccounts();

// Sort by risk score (highest first)
accounts.sort((a, b) => b.riskScore - a.riskScore);

console.log('\n📊 ACCOUNT DASHBOARD\n');
console.log('ID\t\tAge\tRep\tRisk\tStatus');
console.log('-'.repeat(60));

accounts.forEach(acc => {
  const riskIcon = acc.riskScore > 70 ? '🔴' : acc.riskScore > 50 ? '🟡' : '🟢';
  console.log(`${acc.accountId}\t${acc.age}d\t${acc.reputation}\t${acc.riskScore}\t${acc.status} ${riskIcon}`);
});
```

---

## 🔧 TROUBLESHOOTING

### Problem: Session expired

```javascript
// Solution: Re-login
const fb = new FacebookAdvanced(mainWindow, {
  accountId: 'acc_001',
});

// Login với email/password (browser visible)
await fb.login('email@example.com', 'password', false);

// Session sẽ được lưu lại
```

### Problem: High risk score

```javascript
const profile = lifecycle.getAccountProfile('acc_001');

if (profile.riskScore > 70) {
  console.log('⚠️ HIGH RISK - STOP ALL ACTIVITIES');
  console.log('Wait 3-7 days before continuing');
  
  // Reset risk (sau 7 ngày không activity)
  // Risk sẽ tự giảm theo thời gian
}
```

### Problem: Proxy not working

```javascript
// Test proxy
const result = await proxyManager.testProxy(proxyId);

if (!result.success) {
  console.log(`Proxy failed: ${result.error}`);
  
  // Remove và dùng proxy khác
  proxyManager.removeProxy(proxyId);
  
  const newProxy = proxyManager.getBestProxy(accountId, {
    country: 'US',
    type: 'residential',
  });
}
```

---

## 📝 BEST PRACTICES

### 1. Account Warming (Days 0-7)

```javascript
// ✅ DO
- Login 1x per day
- Browse và xem nội dung (5-10 phút)
- Like 1-3 bài viết
- KHÔNG post, KHÔNG comment
- KHÔNG mass action

// ❌ DON'T
- Post ngay khi account mới
- Mass like (>10 likes/ngày)
- Login nhiều lần trong ngày
```

### 2. Proxy Usage

```javascript
// ✅ DO
- Dùng residential proxies
- 1 account = 1 IP (sticky session)
- Match timezone với proxy location
- Test proxy before use

// ❌ DON'T
- Dùng datacenter proxies
- Share 1 proxy cho nhiều accounts
- Thay đổi IP thường xuyên cho 1 account
```

### 3. Human Behavior

```javascript
// ✅ DO
await HumanBehavior.humanType(page, 'input', text);
await HumanBehavior.humanClick(page, 'button');
await HumanBehavior.humanDelay(2000, 5000);

// ❌ DON'T
await page.fill('input', text);
await page.click('button');
await page.waitForTimeout(1000); // Fixed delay
```

### 4. Activity Pattern

```javascript
// ✅ DO
const pattern = HumanBehavior.getDailyActivityPattern();

if (pattern.shouldBeActive) {
  // Perform actions
} else {
  // Sleep time - no activity
}

// ❌ DON'T
// Automation 24/7 - Facebook sẽ phát hiện ngay
```

---

## 🎓 EXAMPLES

### Example 1: Complete Login Flow

```javascript
const { app, BrowserWindow } = require('electron');
const FacebookAdvanced = require('./src/main/automation/FacebookAdvanced');
const AccountLifecycle = require('./src/main/utils/AccountLifecycle');
const ProxyManager = require('./src/main/utils/ProxyManager');

async function main() {
  // Create main window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  // Setup
  const lifecycle = new AccountLifecycle();
  const proxyManager = new ProxyManager();
  
  // Add proxy
  proxyManager.addProxy({
    server: 'http://proxy.com:8080',
    username: 'user',
    password: 'pass',
    type: 'residential',
    country: 'US',
    sticky: true,
  });

  // Create lifecycle profile
  lifecycle.createAccountProfile('my_account');

  // Create Facebook instance
  const fb = new FacebookAdvanced(mainWindow, {
    accountId: 'my_account',
    proxyManager: proxyManager,
    useProxy: true,
  });

  // Login
  const result = await fb.login('email@example.com', 'password', false);

  if (result.success) {
    console.log(`✅ Success: ${result.userName}`);
    
    // Get fanpages
    const pages = await fb.getFanpages();
    console.log(`Found ${pages.length} fanpages`);
    
    // Update lifecycle
    lifecycle.updateActivity('my_account', 'login');
  }

  // Close
  await fb.close();
}

app.whenReady().then(main);
```

### Example 2: Scheduled Automation

```javascript
const cron = require('node-cron');

// Schedule: Every day at 10 AM
cron.schedule('0 10 * * *', async () => {
  console.log('🕐 Running scheduled automation...');
  
  const accounts = lifecycle.listAllAccounts();
  
  for (const account of accounts) {
    // Check if can perform action
    const check = lifecycle.canPerformAction(account.accountId);
    
    if (check.allowed) {
      await performDailyActions(account.accountId);
    } else {
      console.log(`${account.accountId}: ${check.reason}`);
    }
    
    // Delay between accounts
    await HumanBehavior.humanDelay(120000, 180000); // 2-3 minutes
  }
});
```

---

## 🔗 LINKS

- [Full Documentation](./ADVANCED_FEATURES.md)
- [Hướng dẫn tiếng Việt](./HUONG_DAN_SU_DUNG.md)
- [Installation Guide](./INSTALLATION.md)

---

## 💬 SUPPORT

Nếu gặp vấn đề:
1. Check logs
2. Review account lifecycle profile
3. Test proxy connection
4. Read full documentation

---

**Happy Automating! 🚀**

