# 🔧 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY ỨNG DỤNG

## 📋 Mục lục
1. [Cài đặt cho người dùng cuối](#cài-đặt-cho-người-dùng-cuối)
2. [Cài đặt cho developer](#cài-đặt-cho-developer)
3. [Build ứng dụng](#build-ứng-dụng)
4. [Xử lý sự cố](#xử-lý-sự-cố)

---

## Cài đặt cho người dùng cuối

### Yêu cầu hệ thống
- ✅ Windows 10 hoặc mới hơn
- ✅ 4GB RAM (khuyến nghị 8GB)
- ✅ 500MB dung lượng trống
- ✅ Kết nối Internet

### Các bước cài đặt

#### Bước 1: Download file cài đặt
```
1. Truy cập: https://github.com/<your-repo>/releases
2. Tải file mới nhất: Facebook-Page-Manager-Setup-1.0.0.exe
3. Lưu vào thư mục Downloads
```

#### Bước 2: Chạy file cài đặt
```
1. Double-click file .exe vừa tải
2. Nếu Windows SmartScreen cảnh báo:
   - Click "More info"
   - Click "Run anyway"
3. Chọn thư mục cài đặt (mặc định OK)
4. Click "Install"
5. Đợi quá trình cài đặt hoàn tất
6. Click "Finish"
```

#### Bước 3: Mở ứng dụng
```
1. Tìm icon "Facebook Page Manager" trên Desktop
2. Hoặc tìm trong Start Menu
3. Double-click để mở
```

#### Bước 4: Sử dụng
- Xem file `HUONG_DAN_SU_DUNG.md` để biết cách sử dụng chi tiết

---

## Cài đặt cho developer

### Yêu cầu
- ✅ Node.js 16+ ([Download](https://nodejs.org/))
- ✅ npm hoặc yarn
- ✅ Git
- ✅ Windows 10+ (để build .exe)

### Bước 1: Clone repository

```bash
# Clone qua HTTPS
git clone https://github.com/<your-username>/page_management.git

# Hoặc qua SSH
git clone git@github.com:<your-username>/page_management.git

# Di chuyển vào thư mục
cd page_management
```

### Bước 2: Cài đặt dependencies

```bash
# Cài đặt Node.js packages
npm install

# Hoặc dùng yarn
yarn install
```

### Bước 3: Cài đặt Playwright browsers

```bash
# Cài đặt Chromium cho Playwright
npx playwright install chromium

# Nếu gặp lỗi, thử:
npx playwright install --with-deps chromium
```

### Bước 4: Chạy ứng dụng (Development mode)

```bash
# Chạy với npm
npm run dev

# Hoặc với yarn
yarn dev
```

Ứng dụng sẽ mở với DevTools để debug.

### Bước 5: Cấu trúc dự án

```
page_management/
├── src/
│   ├── main/                    # Main process (Node.js)
│   │   ├── main.js             # Entry point chính
│   │   ├── preload.js          # Bridge giữa main và renderer
│   │   └── automation/
│   │       └── facebook.js     # Logic automation Facebook
│   └── renderer/                # Renderer process (UI)
│       ├── index.html          # Giao diện HTML
│       ├── styles.css          # Styles
│       └── app.js              # Logic frontend
├── assets/                      # Resources (icons, images)
│   └── icon.png
├── dist/                        # Build output (auto-generated)
├── node_modules/                # Dependencies
├── package.json                 # Project config
├── .gitignore
├── README.md
├── HUONG_DAN_SU_DUNG.md
└── INSTALLATION.md
```

---

## Build ứng dụng

### Build file .exe (Windows)

#### Bước 1: Chuẩn bị

```bash
# Đảm bảo đã cài đặt tất cả dependencies
npm install

# Cài đặt Playwright browsers
npx playwright install chromium
```

#### Bước 2: Build

```bash
# Build với electron-builder
npm run build:win

# Hoặc
yarn build:win
```

#### Bước 3: Tìm file output

File cài đặt sẽ được tạo trong thư mục `dist/`:
```
dist/
├── Facebook-Page-Manager-Setup-1.0.0.exe  # File cài đặt
└── win-unpacked/                          # Bản portable
```

### Build cho các nền tảng khác

#### macOS (trên máy Mac)

```bash
# Cài đặt dependencies trước
npm install

# Build
npm run build

# Output: dist/Facebook-Page-Manager-1.0.0.dmg
```

#### Linux

```bash
# Cài đặt dependencies trước
npm install

# Build
npm run build

# Output: dist/Facebook-Page-Manager-1.0.0.AppImage
```

### Tối ưu build

#### Code Signing (Windows)

Để tránh cảnh báo SmartScreen, cần code signing:

```javascript
// Thêm vào package.json
"build": {
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "password"
  }
}
```

#### Auto Update

Cấu hình auto-update từ GitHub Releases:

```javascript
// Thêm vào package.json
"build": {
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "page_management"
  }
}
```

---

## Xử lý sự cố

### Sự cố 1: `npm install` lỗi

**Lỗi**: "Cannot find module..." hoặc dependency errors

**Giải pháp**:
```bash
# Xóa node_modules và package-lock
rm -rf node_modules package-lock.json

# Cài lại
npm install

# Hoặc dùng yarn
yarn install
```

### Sự cố 2: Playwright không cài được

**Lỗi**: "Failed to install browsers"

**Giải pháp**:
```bash
# Thử với quyền admin
npx playwright install chromium --with-deps

# Hoặc set biến môi trường
set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
npx playwright install chromium
```

### Sự cố 3: electron-builder lỗi

**Lỗi**: Build failed hoặc NSIS errors

**Giải pháp**:
```bash
# Cài lại electron-builder
npm install electron-builder --save-dev

# Xóa cache
npm cache clean --force

# Build lại
npm run build:win
```

### Sự cố 4: App không chạy sau khi build

**Lỗi**: App crashes khi mở

**Giải pháp**:
```bash
# Kiểm tra console log
npm run dev  # Chạy dev mode để xem lỗi

# Kiểm tra file paths trong code
# Đảm bảo dùng path.join(__dirname, ...) chứ không phải đường dẫn tuyệt đối
```

### Sự cố 5: win-dpapi không hoạt động

**Lỗi**: "win-dpapi is not available"

**Giải pháp**:
```bash
# win-dpapi chỉ hoạt động trên Windows
# Nếu build trên Mac/Linux, có thể bỏ qua

# Nếu trên Windows, rebuild native modules
npm rebuild win-dpapi
```

### Sự cố 6: Hot reload không hoạt động

**Giải pháp**:
```bash
# Thêm electron-reload vào dev dependencies
npm install electron-reload --save-dev

# Thêm vào main.js (trong dev mode)
if (process.argv.includes('--dev')) {
  require('electron-reload')(__dirname);
}
```

---

## 🔍 Debug và Development

### Enable DevTools

DevTools đã được bật sẵn trong dev mode:
```bash
npm run dev
```

Hoặc thêm manually trong `main.js`:
```javascript
mainWindow.webContents.openDevTools();
```

### View logs

**Main process logs**:
```bash
# Xem trong terminal khi chạy
npm run dev
```

**Renderer process logs**:
```bash
# Xem trong DevTools Console (F12)
```

### Debug Playwright

```javascript
// Chạy Playwright ở chế độ slow-mo
this.browser = await chromium.launch({
  headless: false,
  slowMo: 100  // Delay 100ms giữa các thao tác
});
```

---

## 📦 Package dependencies

### Production dependencies

```json
{
  "playwright": "^1.40.0",          // Browser automation
  "win-dpapi": "^0.1.0",           // Windows encryption
  "electron-store": "^8.1.0"       // Persistent storage
}
```

### Development dependencies

```json
{
  "electron": "^27.0.0",           // Desktop framework
  "electron-builder": "^24.6.4"    // Build tool
}
```

### Cài thêm dependencies (optional)

```bash
# Để auto-reload trong dev mode
npm install electron-reload --save-dev

# Để có notification
npm install node-notifier

# Để có file picker nâng cao
npm install electron-dialog
```

---

## 🚀 Deploy và Distribution

### 1. Tạo Release trên GitHub

```bash
# Tag version mới
git tag v1.0.0
git push origin v1.0.0

# Tạo Release trên GitHub
# Upload file .exe vào Assets
```

### 2. Auto Update

Sau khi deploy, users sẽ tự động nhận update nếu cấu hình:

```javascript
// main.js
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

### 3. Analytics (optional)

Theo dõi usage với Google Analytics hoặc Sentry:

```bash
npm install @sentry/electron
```

---

## 📝 Notes

- 📌 Luôn test kỹ trước khi release
- 📌 Backup code trước khi build
- 📌 Đọc docs của Electron và Playwright để hiểu rõ hơn
- 📌 Tuân thủ Facebook Terms of Service

---

## 🔗 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Playwright Documentation](https://playwright.dev/)
- [electron-builder Documentation](https://www.electron.build/)
- [Node.js Documentation](https://nodejs.org/docs)

---

**Happy Coding! 💻**


