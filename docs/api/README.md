# Dùng API GiftMate

FE, BE và QA dùng chung [hợp đồng OpenAPI](../../backend/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml) để thống nhất app gửi gì và backend trả gì. Tên trường JSON dùng camelCase. ID do server cấp là chuỗi, ví dụ `"42"`.

## Tra API trên Swagger

1. Chuẩn bị `.env` theo [README gốc](../../README.md). Từ gốc repo chạy `docker compose up -d --build --wait backend`, rồi mở [Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html).
2. Chọn chức năng cần làm. Xem **Parameters / Request body** để biết dữ liệu cần gửi và **Responses → Schema** để biết kiểu dữ liệu nhận về.
3. Với API đã triển khai, bấm **Try it out → Execute** để gọi backend thật. Nếu cần đăng nhập, lấy `accessToken` từ `POST /auth/login`, dán riêng giá trị token vào **Authorize**, rồi thử `GET /users/me`.

## Thử API khi backend chưa viết xong

FE và QA có thể chạy Prism từ gốc repo để nhận dữ liệu mẫu theo hợp đồng:

```sh
npx --yes @stoplight/prism-cli mock ./backend/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml
```

Ví dụ, gửi `POST http://127.0.0.1:4010/recipients` với JSON `{"name":"Lan","relationship":"PARTNER"}` và header `Authorization: Bearer mock-token`. Mong đợi `201` cùng một người nhận mẫu. Mock sinh phản hồi độc lập cho mỗi request. Việc lưu và đọc lại dữ liệu được kiểm tra trên backend thật.

## Khi thay đổi hợp đồng

Sửa file YAML, rồi chạy từ thư mục `backend` với JDK 25:

```powershell
.\gradlew.bat openApiValidate generateMobileApi test
```

Trên macOS/Linux dùng `./gradlew openApiValidate generateMobileApi test`. FE mở `backend/build/generated-mobile-api/` để tra kiểu trong `models/` và hàm gọi trong `apis/` (ví dụ `createRecipient`). Sửa ở YAML rồi sinh lại khi cần đổi kiểu hoặc tên trường.

Ở PR #6, backend mẫu đã có đăng ký, đăng nhập và xem hồ sơ. CRUD người nhận, sự kiện và quà có thể thử bằng mock. Phần tích hợp client đã sinh vào Expo chờ FE kiểm thử.
