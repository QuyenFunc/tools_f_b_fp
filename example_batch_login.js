/**
 * EXAMPLE: Batch Login Manager Usage
 * 
 * Chạy file này để test batch login
 * Node example_batch_login.js
 */

const { app, BrowserWindow } = require('electron');
const BatchLoginManager = require('./src/main/utils/BatchLoginManager');
const ProxyManager = require('./src/main/utils/ProxyManager');
const AccountLifecycle = require('./src/main/utils/AccountLifecycle');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Ẩn window nếu chạy headless
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
}

async function main() {
  console.log('🚀 BATCH LOGIN MANAGER - EXAMPLE\n');

  // ============================================================
  // SETUP
  // ============================================================
  
  // Initialize proxy manager (optional)
  const proxyManager = new ProxyManager();
  
  // Uncomment để add proxies
  // proxyManager.addProxy({
  //   server: 'http://proxy.example.com:8080',
  //   username: 'user',
  //   password: 'pass',
  //   type: 'residential',
  //   country: 'US',
  //   sticky: true,
  // });

  // Initialize batch manager
  const batchManager = new BatchLoginManager(mainWindow, {
    proxyManager: proxyManager,
  });

  // ============================================================
  // EXAMPLE 1: Parse single account string
  // ============================================================
  
  console.log('=' .repeat(60));
  console.log('EXAMPLE 1: Parse Single Account');
  console.log('='.repeat(60) + '\n');

  const singleAccountString = '61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com|Moimedia@@@|chelcabulamoi@smvmail.com';

  const parseResult = batchManager.parseAccountString(singleAccountString);

  if (parseResult.success) {
    console.log('✅ Parse thành công!');
    console.log('Account:', parseResult.account);
  } else {
    console.log('❌ Parse thất bại:', parseResult.error);
  }

  // ============================================================
  // EXAMPLE 2: Parse batch accounts
  // ============================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 2: Parse Batch Accounts');
  console.log('='.repeat(60) + '\n');

  const batchString = `
61568434832204|Moimedia@@|YDTCEYESIW4LBVLKK3A5HW3ZJKQ3SAF2|chelcabula@outlook.com|Moimedia@@@|chelcabulamoi@smvmail.com
61568434832205|Password123|ABCDEFGHIJKLMNOP2345|user2@email.com
61568434832206|Password456|QRSTUVWXYZ123456789A|user3@email.com
61568434832207|Password789|BCDEFGHIJKLMNOP34567|user4@email.com
61568434832208|PasswordXYZ|CDEFGHIJKLMNOP456789|user5@email.com
61568434832209|PasswordABC|DEFGHIJKLMNOP5678901|user6@email.com
  `.trim();

  const batchParseResult = batchManager.parseBatchString(batchString);

  if (batchParseResult.success) {
    console.log(`✅ Parse thành công!`);
    console.log(`Total: ${batchParseResult.total}`);
    console.log(`Valid: ${batchParseResult.valid}`);
    console.log(`Invalid: ${batchParseResult.invalid}`);
    
    console.log('\nValid Accounts:');
    batchParseResult.accounts.forEach((acc, index) => {
      console.log(`  ${index + 1}. ${acc.email} (ID: ${acc.accountId}) ${acc.twoFASecret ? '🔐' : ''}`);
    });

    if (batchParseResult.errors.length > 0) {
      console.log('\nErrors:');
      batchParseResult.errors.forEach(err => {
        console.log(`  Line ${err.line}: ${err.error}`);
      });
    }
  }

  // ============================================================
  // EXAMPLE 3: Verify sessions
  // ============================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 3: Verify Existing Sessions');
  console.log('='.repeat(60) + '\n');

  if (batchParseResult.success) {
    const accountIds = batchParseResult.accounts.map(a => a.accountId);
    const sessions = await batchManager.verifyAllSessions(accountIds);

    sessions.forEach(s => {
      console.log(`${s.accountId}: ${s.hasSession ? '✅ Có session' : '❌ Không có session'}`);
      
      if (s.profile) {
        console.log(`  Age: ${s.profile.age} days`);
        console.log(`  Reputation: ${s.profile.reputation}/100`);
        console.log(`  Risk: ${s.profile.riskScore}/100`);
        console.log(`  Status: ${s.profile.status}`);
      }
    });
  }

  // ============================================================
  // EXAMPLE 4: Batch login
  // ============================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 4: Batch Login (COMMENTED OUT - Uncomment to run)');
  console.log('='.repeat(60) + '\n');

  console.log('⚠️ Batch login is commented out. Uncomment lines below to run actual login.\n');

  /*
  // UNCOMMENT ĐỂ CHẠY BATCH LOGIN
  
  const loginResult = await batchManager.loginBatch(batchString, {
    headless: true,              // true = ẩn browser, false = hiện browser
    useProxy: false,             // true = dùng proxy, false = không dùng
    skipIfHasSession: true,      // true = skip nếu đã có session
    delayBetweenAccounts: [60000, 120000], // Delay 1-2 phút
    stopOnError: false,          // false = tiếp tục nếu có lỗi
  });

  if (loginResult.success) {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 KẾT QUẢ BATCH LOGIN');
    console.log('='.repeat(60));
    console.log(`Total: ${loginResult.total}`);
    console.log(`✅ Thành công: ${loginResult.successCount}`);
    console.log(`❌ Thất bại: ${loginResult.failedCount}`);
    
    console.log('\nChi tiết:');
    loginResult.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success 
        ? `${result.userName || 'N/A'} ${result.skipped ? '(skipped)' : ''}`
        : result.error;
      
      console.log(`  ${index + 1}. ${icon} ${result.email} - ${status}`);
    });

    // Export results
    batchManager.exportResults('./batch_login_results.txt');
    console.log('\n📄 Results exported to: batch_login_results.txt');
  }
  */

  // ============================================================
  // EXAMPLE 5: Login single account
  // ============================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 5: Login Single Account (COMMENTED OUT)');
  console.log('='.repeat(60) + '\n');

  console.log('⚠️ Single login is commented out. Uncomment to test.\n');

  /*
  // UNCOMMENT ĐỂ TEST LOGIN 1 ACCOUNT
  
  if (parseResult.success) {
    const account = parseResult.account;
    
    const loginResult = await batchManager.loginSingleAccount(account, {
      headless: false,         // Hiện browser để xem
      useProxy: false,
      skipIfHasSession: true,
    });

    if (loginResult.success) {
      console.log(`✅ Đăng nhập thành công!`);
      console.log(`User: ${loginResult.userName}`);
      console.log(`Email: ${loginResult.email}`);
      console.log(`Has 2FA: ${loginResult.has2FA}`);
    } else {
      console.log(`❌ Đăng nhập thất bại: ${loginResult.error}`);
    }
  }
  */

  // ============================================================
  // DONE
  // ============================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ EXAMPLES COMPLETED');
  console.log('='.repeat(60));
  console.log('\nTo run actual login:');
  console.log('1. Uncomment EXAMPLE 4 or EXAMPLE 5');
  console.log('2. Update account credentials');
  console.log('3. Run again: node example_batch_login.js\n');

  // Đóng app
  setTimeout(() => {
    app.quit();
  }, 1000);
}

app.whenReady().then(async () => {
  createWindow();
  
  try {
    await main();
  } catch (error) {
    console.error('❌ Error:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

