# 📱 Facebook Page Manager

Ứng dụng desktop quản lý Facebook Fanpage - Tự động xóa và upload ảnh

## ✨ Tính năng

- 🔐 **Đăng nhập an toàn**: Đăng nhập bằng tài khoản Facebook thật với mã hóa session
- 📄 **Quản lý nhiều Fanpage**: Chọn và làm việc với bất kỳ Fanpage nào bạn quản lý
- 🔍 **Quét ảnh thông minh**: Tự động quét và hiển thị tất cả ảnh trên Fanpage
- 🗑️ **Xóa ảnh hàng loạt**: Chọn và xóa nhiều ảnh cùng lúc
- 🧪 **Chế độ Dry Run**: Chạy thử trước khi xóa thật
- 📤 **Upload hàng loạt**: Upload nhiều ảnh từ thư mục cục bộ
- 📊 **Theo dõi tiến trình**: Hiển thị progress bar và log chi tiết
- 💾 **Lưu phiên đăng nhập**: Không cần đăng nhập lại mỗi lần mở app

## 🚀 Cài đặt

### Yêu cầu hệ thống
- Windows 10 trở lên
- Kết nối Internet

### Cài đặt cho người dùng

1. Tải file `Facebook-Page-Manager-Setup.exe` từ [Releases](../../releases)
2. Chạy file cài đặt và làm theo hướng dẫn
3. Mở ứng dụng và bắt đầu sử dụng

### Cài đặt cho developer

```bash
# Clone repository
git clone <repository-url>
cd page_management

# Cài đặt dependencies
npm install

# Cài đặt Playwright browsers
npx playwright install chromium

# Chạy ứng dụng trong chế độ dev
npm run dev

# Build file .exe
npm run build:win
```

## 📖 Hướng dẫn sử dụng

### 1. Đăng nhập

- Mở ứng dụng
- Nhập email và mật khẩu Facebook
- Chọn "Lưu phiên đăng nhập" để không cần đăng nhập lại
- Click "Đăng nhập"
- Nếu có xác minh 2FA, hoàn thành trong cửa sổ trình duyệt

### 2. Chọn Fanpage

- Sau khi đăng nhập, danh sách Fanpage sẽ hiển thị
- Click vào Fanpage bạn muốn làm việc

### 3. Quét và xóa ảnh

- Click tab "🔍 Quét ảnh"
- Điều chỉnh số ảnh tối đa muốn quét
- Click "Quét ảnh trên Fanpage"
- Chọn ảnh muốn xóa (hoặc "Chọn tất cả")
- Click "Chạy thử (Dry Run)" để xem trước
- Click "Xóa ảnh đã chọn" để xóa thật

### 4. Upload ảnh

- Click tab "📤 Upload ảnh"
- Click "Chọn thư mục ảnh"
- Chọn thư mục chứa ảnh cần upload
- Ảnh sẽ được chọn tự động, bỏ chọn ảnh không muốn upload
- Click "Upload ảnh lên Fanpage"

### 5. Theo dõi tiến trình

- Xem progress bar để biết tiến độ
- Kiểm tra log ở phần dưới để xem chi tiết

## ⚠️ Lưu ý quan trọng

### Bảo mật
- ✅ Thông tin đăng nhập được mã hóa an toàn trên máy của bạn
- ✅ Session được lưu trữ cục bộ, không gửi đi đâu
- ✅ App hoạt động như một người dùng thật, an toàn với Facebook

### Giới hạn
- ⚡ Facebook có thể hạn chế nếu bạn xóa/upload quá nhiều ảnh trong thời gian ngắn
- ⚡ Nên chạy từ từ, có delay giữa các thao tác (app đã tích hợp sẵn)
- ⚡ Nếu gặp checkpoint, cần xác minh thủ công

### Khuyến nghị
- 💡 Luôn chạy Dry Run trước khi xóa ảnh thật
- 💡 Backup ảnh quan trọng trước khi xóa
- 💡 Không nên xóa quá 50-100 ảnh mỗi lần
- 💡 Upload không quá 20-30 ảnh mỗi lần

## 🛠️ Công nghệ sử dụng

- **Electron**: Framework desktop app
- **Playwright**: Tự động hóa trình duyệt
- **Node.js**: Backend logic
- **HTML/CSS/JavaScript**: Giao diện người dùng
- **electron-store**: Lưu trữ dữ liệu an toàn
- **electron-builder**: Đóng gói thành file .exe

## 🔧 Cấu trúc dự án

```
page_management/
├── src/
│   ├── main/
│   │   ├── main.js              # Main process
│   │   ├── preload.js           # Preload script
│   │   └── automation/
│   │       └── facebook.js      # Facebook automation logic
│   └── renderer/
│       ├── index.html           # UI
│       ├── styles.css           # Styles
│       └── app.js               # Frontend logic
├── assets/
│   └── icon.png                 # App icon
├── package.json
└── README.md
```

## 🐛 Xử lý sự cố

### Ứng dụng không khởi động được
- Đảm bảo đã cài đặt đầy đủ
- Chạy lại file cài đặt
- Kiểm tra Windows Defender/Antivirus

### Không đăng nhập được
- Kiểm tra kết nối Internet
- Thử xóa session đã lưu và đăng nhập lại
- Kiểm tra email/password chính xác
- Hoàn thành xác minh 2FA nếu có

### Không quét được ảnh
- Đảm bảo đã chọn Fanpage
- Kiểm tra bạn có quyền quản lý Fanpage
- Thử scroll thủ công trong cửa sổ trình duyệt

### Lỗi khi xóa/upload ảnh
- Facebook có thể hạn chế tạm thời
- Giảm số lượng ảnh mỗi lần
- Đợi vài phút rồi thử lại
- Kiểm tra kết nối Internet

## 📝 Changelog

### Version 1.0.0
- ✨ Release đầu tiên
- 🔐 Đăng nhập Facebook với session management
- 🗑️ Xóa ảnh hàng loạt với dry-run mode
- 📤 Upload ảnh hàng loạt
- 📊 Giao diện quản lý và logging

## 📄 License

MIT License - Sử dụng tự do cho mục đích cá nhân và thương mại

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

## ⚖️ Disclaimer

- Ứng dụng này được tạo ra cho mục đích quản lý Fanpage cá nhân
- Người dùng chịu trách nhiệm về việc sử dụng ứng dụng
- Tác giả không chịu trách nhiệm về việc tài khoản bị khóa do lạm dụng
- Tuân thủ Điều khoản dịch vụ của Facebook

## 📧 Liên hệ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub.

---

**Made with ❤️ by Developer**

