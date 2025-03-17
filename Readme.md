# Khôi Bot

## Tổng quan

Khôi Bot là một trợ lý AI đàm thoại đa năng được xây dựng sử dụng Google Generative AI (Gemini) API. Ứng dụng cung cấp giao diện chat thân thiện với người dùng, cho phép tương tác với bot để hỗ trợ học tập, nghiên cứu và tạo nội dung.

### Tính năng chính

- **Giao diện chat thời gian thực** với trợ lý AI Khôi Bot
- **Hệ thống xác thực người dùng** với đăng nhập và đăng ký
- **Lưu trữ và quản lý lịch sử cuộc trò chuyện**
- **Hỗ trợ đa ngôn ngữ** (chủ yếu là tiếng Việt và tiếng Anh)
- **Thiết kế đáp ứng** hoạt động trên máy tính để bàn và thiết bị di động
- **Hỗ trợ chế độ sáng/tối**
- **Xuất cuộc trò chuyện** dưới dạng JSON
- **Chức năng khôi phục mật khẩu**

## Kiến trúc

Hệ thống bao gồm hai thành phần chính:

1. **Dịch vụ API Backend**: Máy chủ Express Node.js giao tiếp với Google Generative AI API
2. **Giao diện Web Frontend**: Ứng dụng web HTML/CSS/JavaScript để tương tác với người dùng

### Stack công nghệ

- **Backend**: 
  - Node.js với Express
  - Google Generative AI SDK
  - Docker cho containerization
  - Ngrok để công khai máy chủ cục bộ ra internet
  
- **Frontend**:
  - HTML5, CSS3, JavaScript
  - LocalStorage để lưu trữ dữ liệu phía client
  - Giao tiếp REST API với backend

## Yêu cầu hệ thống

- Node.js (v18 trở lên)
- Docker và Docker Compose
- Google Generative AI API key
- Ngrok authentication token

## Cài đặt và thiết lập

### 1. Clone Repository

```bash
git clone https://github.com/TCGxDreams/GenAI_Final.git
cd server
```

### 2. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc với các biến sau:

```
API_KEY=your_google_generative_ai_api_key
NGROK_AUTH_TOKEN=your_ngrok_auth_token
```

### 3. Xây dựng và chạy với Docker

# Cách 1:
```bash
# Xây dựng và khởi động tất cả dịch vụ
docker-compose up -d

# Xem logs
docker-compose logs -f
```
# Cách 2:
```bash
# Cấp quyền cho các file cần thiết
 chmod +x run-services.sh display-ngrok-url.sh get-url.sh
# Chạy file cài đặt
./run_services

### 4. Lấy URL công khai
# Cách 1: Khi sử dụng cách 1 ở 3.
Sau khi khởi động các dịch vụ, bạn có thể lấy URL công khai cho API của bạn bằng một trong các phương pháp sau:

```bash
# Cách 1: Chạy script hiển thị URL
./display-ngrok-url.sh

# Cách 2: Sử dụng script get-url nếu cách đầu tiên thất bại
./get-url.sh
```

URL công khai sẽ được hiển thị theo định dạng: `https://xxxx-xxxx-xxxx.ngrok.io/generate`

# Cách 2 Khi sử dụng cách 2 ở 3. 
Sau khi chạy file cài đặt ta sẽ có tất cả bao gồm cả link Ngrok được hiển thị

## Chạy không cần Docker

Nếu bạn muốn chạy ứng dụng mà không dùng Docker:

### 1. Cài đặt thư viện phụ thuộc

```bash
# chạy lệnh npm install, các thư viện đã thiết lập trong file sẽ được chạy
npm install
```

### 2. Khởi động máy chủ

```bash
node server.js
```

Máy chủ sẽ khả dụng tại `http://localhost:3000`

## Endpoints API

### Tạo phản hồi

- **URL**: `/generate`
- **Phương thức**: POST
- **Body**:
  ```json
  {
    "message": "Tin nhắn người dùng", 
    "chatHistory": [
      {"role": "user", "content": "Tin nhắn người dùng trước đó"},
      {"role": "bot", "content": "Phản hồi bot trước đó"}
    ]
  }
  ```
- **Phản hồi**:
  ```json
  {
    "response": "Nội dung phản hồi của bot"
  }
  ```

## Giao diện người dùng

Giao diện người dùng bao gồm một số trang HTML:

- `index.html` - Giao diện chat chính
- `login.html` - Trang đăng nhập người dùng
- `register.html` - Trang đăng ký người dùng mới

Để đoạn chat từ Khôi có thể chạy với giao diện các bạn truy cập 'chat.js' tại folder js
sau đó thay 
const API_ENDPOINT ="Link bạn chọn"
rồi khởi động index.html 

### Tính năng giao diện chat

- Thanh bên với danh sách lịch sử chat
- Ô nhập tin nhắn với nút gửi
- Khu vực hiển thị tin nhắn của người dùng và bot
- Tùy chọn xuất cuộc trò chuyện và xóa lịch sử chat
- Quản lý hồ sơ người dùng
- Chuyển đổi chủ đề (chế độ tối/sáng)

## Tùy chỉnh

### Thay đổi tính cách của Bot

Để thay đổi tính cách hoặc hướng dẫn cụ thể của bot, chỉnh sửa tham số `systemInstruction` trong file `server.js`:

```javascript
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-thinking-exp-01-21", 
  systemInstruction: "Hướng dẫn tùy chỉnh của bạn...",
});
```

### Giao diện

Giao diện của ứng dụng có thể được tùy chỉnh bằng cách sửa đổi các biến CSS trong file `chat.css`. Bảng màu, kích thước phông chữ và các yếu tố trực quan khác có thể được điều chỉnh để phù hợp với thương hiệu của bạn.

## Xử lý sự cố

### Vấn đề thường gặp

1. **Lỗi kết nối API**
   - Xác minh API key Google Generative AI của bạn là chính xác
   - Kiểm tra kết nối mạng
   - Đảm bảo hạn ngạch sử dụng API của bạn chưa vượt quá

2. **Vấn đề Ngrok**
   - Xác minh token xác thực Ngrok của bạn
   - Kiểm tra logs Ngrok với `docker-compose logs ngrok`
   - Truy cập bảng điều khiển Ngrok tại `http://localhost:4040`

3. **Vấn đề Docker**
   - Đảm bảo Docker và Docker Compose được cài đặt đúng cách
   - Kiểm tra xem cổng 3000 và 4040 có khả dụng không
   - Khởi động lại các dịch vụ với `docker-compose restart`

## Cân nhắc bảo mật

- Ứng dụng bao gồm các biện pháp bảo mật cơ bản như mã hóa mật khẩu (mô phỏng trong bản demo)
- Để sử dụng trong sản xuất, nên triển khai HTTPS, xác thực nâng cao và giới hạn tần suất
- Cân nhắc triển khai xác thực đầu vào phía máy chủ

## Cải tiến trong tương lai

- Thêm chỉ báo đang nhập và báo đã đọc
- Triển khai thông báo thời gian thực
- Hỗ trợ tải lên và đính kèm tệp
- Thêm khả năng đầu vào/đầu ra bằng giọng nói
- Tăng cường phân tích và thống kê sử dụng

