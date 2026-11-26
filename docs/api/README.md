# Dùng API GiftMate

FE, BE và QA dùng chung [hợp đồng OpenAPI](../../backend/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml) để thống nhất app gửi gì và backend trả gì. Tên trường JSON dùng camelCase. ID do server cấp là chuỗi, ví dụ `"42"`.

## Tra API trên Swagger

> **API có biểu tượng khóa yêu cầu đăng nhập.** Gọi `POST /auth/login`, sao chép giá trị `accessToken` trong **Server response**, rồi bấm **Authorize** ở đầu Swagger và dán token vào ô **BearerAuth**. Swagger tự thêm tiền tố `Bearer` khi gửi request.

1. Chuẩn bị `.env` theo [README gốc](../../README.md). Từ gốc repo chạy `docker compose up -d --build --wait backend`, rồi mở [Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html).
2. Chọn chức năng cần làm. Xem **Parameters / Request body** để biết dữ liệu cần gửi và **Responses → Schema** để biết kiểu dữ liệu nhận về.
3. Với API đã triển khai, bấm **Try it out → Execute** để gọi backend thật. Thử `GET /users/me` để kiểm tra token và xem hồ sơ tài khoản.

## Thử API khi backend chưa viết xong

FE và QA có thể chạy Prism từ gốc repo để nhận dữ liệu mẫu theo hợp đồng:

```sh
npx --yes @stoplight/prism-cli mock ./backend/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml
```

Ví dụ gửi `POST http://127.0.0.1:4010/auth/login` với JSON `{"email":"khanh@example.com","password":"matkhau123"}`. Prism trả phản hồi mẫu theo schema, không xác thực mật khẩu và token mẫu không dùng được với backend thật. Backend thật hiện trả `accessToken`, `tokenType`, `expiresIn` và `user`; `refreshToken` còn chờ #13. ID trong `user` là chuỗi thập phân, kể cả khi lớn hơn giới hạn số nguyên an toàn của JavaScript.

Các endpoint người nhận, sự kiện và quà trong hợp đồng là dự kiến cho cloud; Prism có thể giả lập chúng nhưng không lưu dữ liệu giữa các request. MVP lưu dữ liệu này trong SQLite theo hồ sơ trên thiết bị, không gọi các endpoint đó khi đăng nhập. Khách có lần lượt 2, 3, 3 và 5 lượt cộng dồn cho tạo người nhận, tạo sự kiện, đặt mốc nhắc và lưu ý tưởng thủ công. Sau xác thực, Free mở chức năng cơ bản. `POST /auth/sync` dành cho cloud về sau và không thuộc đường chạy đăng nhập MVP.

## Khi thay đổi hợp đồng

Sửa file YAML, rồi chạy từ thư mục `backend` với JDK 25:

```powershell
.\gradlew.bat openApiValidate generateMobileApi test
```

Trên macOS/Linux dùng `./gradlew openApiValidate generateMobileApi test`. FE mở `backend/build/generated-mobile-api/` để tra kiểu trong `models/` và hàm gọi trong `apis/` (ví dụ `createRecipient`). Sửa ở YAML rồi sinh lại khi cần đổi kiểu hoặc tên trường.

Backend tài khoản hỗ trợ đăng ký, đăng nhập email, Google/Apple và xem hồ sơ; OAuth cần cấu hình audience của provider. Client mới gửi `displayName`, client cũ có thể gửi `fullName`. Xác thực không tự liên kết tài khoản khác có cùng email. Phần phát hành, xoay và thu hồi refresh token thuộc #13.
