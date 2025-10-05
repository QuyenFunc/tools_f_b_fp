# 📚 HƯỚNG DẪN SỬ DỤNG CHI TIẾT

## 🎯 Mục lục
1. [Cài đặt](#1-cài-đặt)
2. [Đăng nhập lần đầu](#2-đăng-nhập-lần-đầu)
3. [Quét và xóa ảnh](#3-quét-và-xóa-ảnh)
4. [Upload ảnh](#4-upload-ảnh)
5. [Tips và thủ thuật](#5-tips-và-thủ-thuật)
6. [Xử lý sự cố](#6-xử-lý-sự-cố)

---

## 1. Cài đặt

### Cài đặt ứng dụng (Người dùng thông thường)

1. **Download file cài đặt**
   - Truy cập trang Releases
   - Tải file `Facebook-Page-Manager-Setup.exe`

2. **Chạy file cài đặt**
   - Double-click file `.exe` vừa tải
   - Nếu Windows cảnh báo SmartScreen, click "More info" → "Run anyway"
   - Chọn thư mục cài đặt (mặc định: C:\Program Files\Facebook Page Manager)
   - Click "Install"

3. **Mở ứng dụng**
   - Tìm icon trên Desktop hoặc Start Menu
   - Double-click để mở

### Cài đặt từ source code (Developer)

```bash
# 1. Clone repository
git clone <repository-url>
cd page_management

# 2. Cài đặt Node.js dependencies
npm install

# 3. Cài đặt Playwright browsers
npx playwright install chromium

# 4. Chạy ứng dụng
npm run dev

# 5. Build file .exe (optional)
npm run build:win
```

---

## 2. Đăng nhập lần đầu

### Bước 1: Mở ứng dụng
- Mở "Facebook Page Manager"
- Bạn sẽ thấy màn hình đăng nhập

### Bước 2: Nhập thông tin
- **Email/Số điện thoại**: Nhập email hoặc số điện thoại Facebook của bạn
- **Mật khẩu**: Nhập mật khẩu Facebook
- **Lưu phiên đăng nhập**: Tích vào ô này để không cần đăng nhập lại lần sau

### Bước 3: Đăng nhập
- Click nút "Đăng nhập"
- Một cửa sổ trình duyệt Chromium sẽ mở ra
- Đợi quá trình đăng nhập tự động

### Bước 4: Xử lý xác minh 2FA (nếu có)
- Nếu tài khoản của bạn có bật 2FA:
  - Ứng dụng sẽ hiển thị thông báo "Vui lòng hoàn thành xác minh 2FA"
  - Nhập mã OTP từ ứng dụng xác thực (Google Authenticator, Authy, etc.)
  - Hoặc nhập mã từ SMS
  - Ứng dụng sẽ đợi tối đa 5 phút để bạn xác minh
  
- Sau khi xác minh xong, ứng dụng sẽ tự động tiếp tục

### Bước 5: Đăng nhập thành công
- Khi đăng nhập thành công, bạn sẽ thấy:
  - Danh sách các Fanpage bạn quản lý
  - Giao diện chính của ứng dụng

---

## 3. Quét và xóa ảnh

### Bước 1: Chọn Fanpage
- Ở phần "Chọn Fanpage", click vào Fanpage bạn muốn làm việc
- Fanpage được chọn sẽ được highlight màu xanh

### Bước 2: Quét ảnh
1. Click tab "🔍 Quét ảnh"
2. Điều chỉnh "Số ảnh tối đa" (mặc định: 100)
   - Giá trị nhỏ: Quét nhanh hơn, ít ảnh hơn
   - Giá trị lớn: Quét lâu hơn, nhiều ảnh hơn
3. Click nút "Quét ảnh trên Fanpage"
4. Đợi quá trình quét hoàn tất (có thể mất vài phút)

### Bước 3: Chọn ảnh cần xóa
- **Chọn từng ảnh**: Click vào ảnh để chọn/bỏ chọn
- **Chọn tất cả**: Click nút "Chọn tất cả"
- **Bỏ chọn tất cả**: Click nút "Bỏ chọn tất cả"
- Ảnh được chọn sẽ có viền xanh và dấu tick

### Bước 4: Chạy thử (Dry Run) - KHUYẾN NGHỊ
⚠️ **QUAN TRỌNG**: Luôn chạy Dry Run trước!

1. Click nút "Chạy thử (Dry Run)"
2. Xác nhận trong popup
3. Ứng dụng sẽ mô phỏng quá trình xóa NHƯNG KHÔNG XÓA THẬT
4. Xem kết quả trong log để đảm bảo mọi thứ OK

### Bước 5: Xóa ảnh thật
⚠️ **CẢNH BÁO**: Hành động này KHÔNG THỂ HOÀN TÁC!

1. Đảm bảo bạn đã backup ảnh quan trọng
2. Click nút "Xóa ảnh đã chọn"
3. Đọc kỹ cảnh báo và xác nhận
4. Đợi quá trình xóa hoàn tất
5. Kiểm tra log để xem kết quả

### Tips xóa ảnh hiệu quả:
- ✅ Xóa từ 20-50 ảnh mỗi lần
- ✅ Đợi 5-10 phút giữa các lần xóa
- ✅ Luôn chạy Dry Run trước
- ❌ Không xóa hàng trăm ảnh cùng lúc
- ❌ Không spam xóa liên tục

---

## 4. Upload ảnh

### Bước 1: Chuẩn bị ảnh
- Tạo một thư mục chứa ảnh cần upload
- Đảm bảo ảnh có định dạng: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Đặt tên file dễ nhận biết

### Bước 2: Chọn thư mục
1. Click tab "📤 Upload ảnh"
2. Click nút "Chọn thư mục ảnh"
3. Chọn thư mục chứa ảnh
4. Ứng dụng sẽ tự động load tất cả ảnh trong thư mục

### Bước 3: Chọn ảnh cần upload
- Mặc định tất cả ảnh đều được chọn
- Click vào ảnh để bỏ chọn ảnh không muốn upload
- Số ảnh đã chọn sẽ hiển thị ở phía trên

### Bước 4: Upload
1. Đảm bảo đã chọn đúng Fanpage ở bước đầu
2. Click nút "Upload ảnh lên Fanpage"
3. Xác nhận trong popup
4. Đợi quá trình upload (có thể mất vài phút)
5. Xem progress bar để theo dõi tiến độ

### Bước 5: Kiểm tra kết quả
- Sau khi upload xong, kiểm tra log
- Ứng dụng sẽ hiển thị:
  - Số ảnh upload thành công
  - Số ảnh upload thất bại (nếu có)
- Truy cập Fanpage để xem ảnh vừa upload

### Tips upload hiệu quả:
- ✅ Upload từ 10-20 ảnh mỗi lần
- ✅ Đợi 10-15 phút giữa các lần upload
- ✅ Đặt tên file rõ ràng
- ✅ Kiểm tra kích thước file (không quá 10MB/ảnh)
- ❌ Không upload hàng trăm ảnh cùng lúc
- ❌ Không upload ảnh có nội dung vi phạm

---

## 5. Tips và thủ thuật

### Tối ưu hiệu suất
- 🚀 Đóng các ứng dụng khác khi chạy
- 🚀 Đảm bảo kết nối Internet ổn định
- 🚀 Không thao tác vào cửa sổ trình duyệt khi app đang chạy

### Tránh bị Facebook hạn chế
- ⏱️ Không thực hiện quá nhiều hành động trong thời gian ngắn
- ⏱️ Thêm delay giữa các thao tác (app đã tích hợp sẵn)
- ⏱️ Không chạy 24/7

### Bảo mật
- 🔒 Không chia sẻ session đã lưu
- 🔒 Đăng xuất khi không sử dụng
- 🔒 Không cài đặt trên máy chung

### Backup dữ liệu
- 💾 Luôn backup ảnh quan trọng trước khi xóa
- 💾 Lưu ảnh gốc ở nơi khác trước khi upload
- 💾 Không xóa ảnh duy nhất còn lại

---

## 6. Xử lý sự cố

### Sự cố 1: Không đăng nhập được

**Triệu chứng**: Hiển thị lỗi khi đăng nhập

**Giải pháp**:
1. Kiểm tra email/password chính xác
2. Kiểm tra kết nối Internet
3. Thử đăng nhập trên trình duyệt thông thường trước
4. Xóa session đã lưu và thử lại:
   - Click "Xóa phiên đã lưu"
   - Đăng nhập lại

### Sự cố 2: Session hết hạn

**Triệu chứng**: "Session đã hết hạn, vui lòng đăng nhập lại"

**Giải pháp**:
1. Click "Xóa phiên đã lưu"
2. Đăng nhập lại bằng email + password
3. Tích vào "Lưu phiên đăng nhập"

### Sự cố 3: Không quét được ảnh

**Triệu chứng**: Không có ảnh nào hiển thị sau khi quét

**Giải pháp**:
1. Đảm bảo đã chọn đúng Fanpage
2. Kiểm tra bạn có quyền quản lý Fanpage
3. Thử tăng "Số ảnh tối đa"
4. Scroll thủ công trong cửa sổ trình duyệt
5. Refresh và thử lại

### Sự cố 4: Lỗi khi xóa ảnh

**Triệu chứng**: Một số ảnh không xóa được

**Giải pháp**:
1. Facebook có thể hạn chế tạm thời
2. Giảm số lượng ảnh mỗi lần xuống còn 20-30 ảnh
3. Đợi 10-15 phút
4. Thử lại với số lượng ít hơn

### Sự cố 5: Lỗi khi upload ảnh

**Triệu chứng**: Upload thất bại hoặc chỉ upload được một phần

**Giải pháp**:
1. Kiểm tra kích thước ảnh (không quá 10MB)
2. Kiểm tra định dạng ảnh hợp lệ
3. Kiểm tra kết nối Internet
4. Giảm số lượng ảnh xuống 10-15 ảnh
5. Thử upload từng batch nhỏ

### Sự cố 6: Gặp Checkpoint

**Triệu chứng**: Facebook yêu cầu xác minh danh tính

**Giải pháp**:
1. Hoàn thành xác minh trong cửa sổ trình duyệt
2. Facebook có thể yêu cầu:
   - Xác nhận ảnh bạn bè
   - Xác nhận số điện thoại
   - Upload CMND/CCCD
3. Sau khi xác minh xong, đăng nhập lại app

### Sự cố 7: Ứng dụng bị treo/crash

**Triệu chứng**: App không phản hồi hoặc tắt đột ngột

**Giải pháp**:
1. Đóng ứng dụng (Task Manager nếu cần)
2. Khởi động lại ứng dụng
3. Session đã lưu vẫn còn, có thể đăng nhập lại
4. Nếu vẫn crash, cài đặt lại ứng dụng

### Sự cố 8: Trình duyệt không mở

**Triệu chứng**: Không thấy cửa sổ trình duyệt khi đăng nhập

**Giải pháp**:
1. Kiểm tra Windows Defender/Antivirus có chặn không
2. Thêm ứng dụng vào whitelist
3. Cài đặt lại Playwright browsers:
   ```bash
   npx playwright install chromium
   ```
4. Khởi động lại ứng dụng

---

## ❓ Câu hỏi thường gặp (FAQ)

### Q1: Ứng dụng có an toàn không?
**A**: Có, ứng dụng:
- Hoạt động như người dùng thật
- Không gửi dữ liệu đi đâu
- Mã hóa session trên máy bạn
- Không lưu password nếu không tích "Lưu phiên"

### Q2: Có bị khóa tài khoản không?
**A**: Rất hiếm, nếu:
- Sử dụng đúng cách (không spam)
- Thêm delay giữa các thao tác
- Không chạy liên tục 24/7

### Q3: Có thể xóa tất cả ảnh cùng lúc không?
**A**: Không nên! Facebook sẽ phát hiện và hạn chế. Nên:
- Xóa 20-50 ảnh mỗi lần
- Đợi 5-10 phút giữa các lần
- Chia thành nhiều batch nhỏ

### Q4: Có thể lọc ảnh theo ngày không?
**A**: Hiện tại chưa hỗ trợ. Facebook không hiển thị ngày rõ ràng trên giao diện. Bạn cần chọn ảnh thủ công.

### Q5: Có thể thêm caption khi upload không?
**A**: Hiện tại chưa hỗ trợ thêm caption riêng cho từng ảnh. Sẽ cập nhật trong phiên bản sau.

### Q6: Ứng dụng có hoạt động trên Mac/Linux không?
**A**: Hiện tại chỉ hỗ trợ Windows. Có thể build cho Mac/Linux nhưng cần test thêm.

### Q7: Tôi có thể đóng góp code không?
**A**: Có! Pull requests luôn được chào đón.

---

## 📞 Liên hệ hỗ trợ

Nếu gặp vấn đề không giải quyết được:
1. Kiểm tra lại hướng dẫn này
2. Tạo issue trên GitHub với thông tin chi tiết:
   - Mô tả lỗi
   - Các bước tái hiện
   - Screenshot (nếu có)
   - Log từ ứng dụng

---

**Chúc bạn sử dụng thành công! 🎉**

