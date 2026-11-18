# Sử dụng API GiftMate

FE, BE và QA dùng chung [hợp đồng OpenAPI](../../backend/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml). Mở `paths` để tra phương thức, đường dẫn, request và mã phản hồi. Mở `components.schemas` để tra trường bắt buộc, enum và kiểu dữ liệu. JSON dùng camelCase. ID do server cấp là chuỗi chữ số, ví dụ `"42"`.

## FE và QA · thử CRUD khi backend đang phát triển

Dùng Node.js và mở PowerShell tại **thư mục gốc repo**. Khởi động Prism để sinh phản hồi mẫu từ cùng file YAML:

```powershell
npx --yes @stoplight/prism-cli mock ./backend/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml
```

Giữ cửa sổ này mở. Từ cửa sổ PowerShell thứ hai, thử tạo người nhận trên mock:

```powershell
$headers = @{ Authorization = 'Bearer mock-token' }
$body = @{ name = 'Lan'; relationship = 'PARTNER' } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://127.0.0.1:4010/recipients' -Headers $headers -ContentType 'application/json' -Body $body
```

Kiểm tra mã `201` và `id` dạng chuỗi trong nội dung phản hồi. Thử bỏ `relationship` rồi gửi lại để kiểm tra lỗi thiếu trường. Prism trả dữ liệu mẫu cho từng request độc lập. Việc tạo, đọc lại sau khi sửa và xóa khỏi database được kiểm thử trên backend khi module đã triển khai.

| Thao tác trên màn hình | Request tối thiểu để tạo |
| --- | --- |
| Thêm người nhận | `{"name":"Lan","relationship":"PARTNER"}` |
| Tạo sự kiện | `{"title":"Sinh nhật Lan","eventType":"BIRTHDAY","originalDay":20,"originalMonth":11,"recipientIds":["42"]}` |
| Lưu quà thủ công | `{"name":"Sách","recipientId":"42"}` |

Ba nhóm dùng các đường dẫn `/recipients`, `/events`, `/gifts`. Mỗi nhóm có POST và GET danh sách trên đường dẫn gốc, cùng GET chi tiết, PATCH và DELETE trên đường dẫn có `/{id}`.

## Thử backend thật bằng Swagger UI

1. Chuẩn bị Docker Desktop và file `.env` theo [README gốc](../../README.md). Tại gốc repo chạy `docker compose up -d --build --wait backend`.
2. Mở [Swagger UI](http://127.0.0.1:8080/swagger-ui/index.html). **Schema** liệt kê trường và kiểu dữ liệu. **Try it out → Execute** gửi request đến backend tại `http://127.0.0.1:8080/api/v1`. Kết quả thực tế nằm trong **Server response**.
3. Với backend mẫu, đăng ký qua `POST /auth/register` bằng `email`, `password`, `displayName`, hoặc đăng nhập tài khoản đã có qua `POST /auth/login`. Sao chép giá trị `accessToken` từ response.
4. Bấm **Authorize → BearerAuth**, dán riêng giá trị token, bấm **Authorize → Close**. Gọi `GET /users/me` và kiểm tra mã `200` cùng email của tài khoản. Khi gặp `401`, kiểm tra header `Authorization` trong phần Curl trên máy mình. Khi chia sẻ kết quả, ẩn token và mật khẩu.

Ở thời điểm PR #6, backend mẫu xử lý đăng ký, đăng nhập và xem hồ sơ. Các nhóm CRUD người nhận, sự kiện và quà đã có schema để FE dùng mock. Ví dụ, backend thật trả `404` khi gọi `POST /recipients` với token hợp lệ vì controller tạo người nhận còn chờ triển khai. Phần auth mẫu trả `accessToken` và `user`, trong đó `user.id` đang là số và tên hiển thị là `fullName`. Khi triển khai theo contract, đối chiếu lại với schema auth và lỗi `ApiError`.

## Khi thay đổi hợp đồng

Sửa YAML trong PR và ghi rõ màn hình hoặc client bị ảnh hưởng. Chạy từ thư mục `backend` với JDK 25:

```powershell
.\gradlew.bat openApiValidate generateMobileApi test
```

Trên Linux/macOS dùng `./gradlew openApiValidate generateMobileApi test`. Client TypeScript nằm ở `backend/build/generated-mobile-api/`. FE kiểm tra kiểu request/response trong client vừa sinh và chạy type-check khi tích hợp vào mobile. BE dùng `openApiGenerate` để sinh interface Spring và model trong `backend/build/generated/`. Mỗi lần đổi schema, sinh lại mã từ YAML.

Khi controller đã sẵn sàng, chạy luồng tạo → lấy theo ID → sửa → đọc lại → xóa → đọc lại trên backend thật. Xác nhận dữ liệu mới sau PATCH, DELETE trả `204` và GET sau xóa trả `404`. Kiểm tra thêm mã HTTP và cấu trúc lỗi cho đầu vào sai.
