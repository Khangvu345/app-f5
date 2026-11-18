# Sử dụng API GiftMate

## Bắt đầu từ đây

Hợp đồng API là thỏa thuận giữa ứng dụng mobile và backend về dữ liệu hai bên trao đổi qua HTTP. Với mỗi chức năng, cả nhóm thống nhất ứng dụng sẽ gọi đường dẫn nào, gửi dữ liệu gì, nhận về những trường nào và xử lý lỗi ra sao. GiftMate dùng **contract-first**: nhóm ghi thỏa thuận vào [file OpenAPI](../../backend/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml) để FE và BE có thể bắt đầu cùng lúc. Swagger UI hiển thị nội dung của file này theo từng nhóm chức năng.

- **FE** tra dữ liệu màn hình cần gửi và nhận, dùng kiểu TypeScript sinh từ hợp đồng và dựng màn hình bằng dữ liệu mock trong lúc chờ backend.
- **BE** dựa vào cùng mô tả để viết controller, kiểm tra đầu vào và trả đúng mã HTTP, tên trường và kiểu dữ liệu mà FE đang dùng.
- **QA** lấy các trường bắt buộc, giới hạn, enum và phản hồi lỗi làm cơ sở viết ca kiểm thử. Khi backend hoàn thành, so sánh phản hồi thật với hợp đồng.

### Tìm API cho công việc đang làm

Trong Swagger, mở nhóm chức năng tương ứng. Nếu đọc YAML trên GitHub, tìm đường dẫn trong `paths` rồi theo `$ref` đến `components.schemas` để xem cấu trúc dữ liệu. Bảng dưới liệt kê một số điểm bắt đầu. Các đường dẫn đều dùng chung tiền tố `/api/v1` trên backend.

| Công việc | Đường dẫn để bắt đầu tra |
| --- | --- |
| Đăng nhập, hồ sơ và cài đặt | `/auth/login`, `/users/me`, `/users/me/settings` |
| Người nhận và sở thích | `/recipients`, `/recipients/{id}/preferences` |
| Sự kiện và lịch | `/events`, `/events/calendar`, `/events/{id}/occurrences` |
| Lời nhắc, thông báo và thiết bị | `/events/{id}/reminder-rules`, `/notifications`, `/devices` |
| Quà, chi phí và ngân sách | `/gifts`, `/gifts/{id}/expenses`, `/budgets/summary` |
| AI, hạn mức và quản trị | `/ai/requests`, `/ai/quota`, `/admin/plan-limits` |

Ví dụ, khi nhận màn hình **Lịch theo tháng**, FE mở **Sự kiện → GET /events/calendar**. Mục **Parameters** cho biết `from` và `to` là hai ngày tùy chọn truyền trên URL. FE có thể gọi `GET /api/v1/events/calendar?from=2026-11-01&to=2026-11-30`. Mục **Responses → 200 → Schema** dẫn tới `CalendarPage`, nơi cả nhóm tra cấu trúc kết quả. BE dùng mô tả để xử lý trường hợp bỏ trống khoảng ngày, QA kiểm tra mặc định là tháng hiện tại theo múi giờ `Asia/Ho_Chi_Minh`. Đây là cách đọc áp dụng được cho các API khác. Với thao tác có **Request body**, đọc thêm các trường bắt buộc trước khi gửi. JSON dùng camelCase và ID do server cấp là chuỗi chữ số, ví dụ `"42"`.

Một API xuất hiện trong Swagger khi nhóm đã đưa mô tả vào YAML. Việc triển khai và nghiệm thu trên server diễn ra theo từng module. Đợt hiện tại ưu tiên CRUD người nhận, sự kiện và quà thủ công. Phần Premium và hạn mức AI sẽ được hoàn thiện sau. Các bước dưới đây dùng CRUD để minh họa cách thử hợp đồng và dùng auth mẫu để minh họa cách gọi backend thật.

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

## FE dùng gì trong client TypeScript đã sinh?

Mở `backend/build/generated-mobile-api/` sau khi chạy `generateMobileApi`. Cả thư mục là client TypeScript được sinh từ YAML.

| Thành phần | Khi nào FE cần |
| --- | --- |
| `models/` | Tra kiểu dữ liệu gửi và nhận. Ví dụ với form thêm người nhận, mở `RecipientCreate.ts` để xem các trường khi gửi, rồi mở `Recipient.ts` để xem kiểu kết quả. |
| `apis/` | Tìm theo tên thao tác trong Swagger (ví dụ `createRecipient`) để thấy hàm gọi HTTP, tham số và kiểu trả về. Tìm theo thao tác cũng hữu ích khi tên file sinh từ tag tiếng Việt khó đọc. |
| `runtime.ts` | Chứa phần dùng chung của client Fetch, gồm cấu hình địa chỉ server, token và cách gửi request. |
| `index.ts` | Điểm export để ứng dụng import các API, model và cấu hình khi tích hợp client. |

Ví dụ, với màn hình **Thêm người nhận**, FE đối chiếu dữ liệu từ form với `RecipientCreate`, xem chữ ký `createRecipient` và dùng kiểu `Recipient` để đọc ID trong kết quả. Trong VS Code, nhấn **Ctrl + Shift + F**, nhập `createRecipient` và giới hạn tìm kiếm trong thư mục đã sinh. Nếu VS Code bỏ qua `build/`, mở trực tiếp `apis/` rồi tìm trong file.

**Trạng thái tích hợp ở PR #6:** Gradle xuất mã vào thư mục build của backend. App Expo hiện gọi API qua Axios tại `mobile/src/services/api/`. Chạy generator chưa đưa client vào bundle của app. FE có thể tra kiểu và thử payload trên mock ngay. Để gọi trực tiếp từ mã sinh, team cần tích hợp đầu ra dưới dạng module mà mobile import được, cấu hình URL và Bearer token cho client Fetch rồi chạy type-check trong mobile. Interceptor token của Axios chỉ áp dụng cho các request qua Axios.

Khi cần đổi một trường hay một thao tác, sửa YAML rồi chạy lại generator. Các file trong `build/` có thể được tạo lại khi build hoặc bị xóa bởi Gradle `clean`.

## Khi thay đổi hợp đồng

Sửa YAML trong PR và ghi rõ màn hình hoặc client bị ảnh hưởng. Chạy từ thư mục `backend` với JDK 25:

```powershell
.\gradlew.bat openApiValidate generateMobileApi test
```

Trên Linux/macOS dùng `./gradlew openApiValidate generateMobileApi test`. Client TypeScript nằm ở `backend/build/generated-mobile-api/`. FE kiểm tra kiểu request/response trong client vừa sinh và chạy type-check khi tích hợp vào mobile. BE dùng `openApiGenerate` để sinh interface Spring và model trong `backend/build/generated/`. Mỗi lần đổi schema, sinh lại mã từ YAML.

Khi controller đã sẵn sàng, chạy luồng tạo → lấy theo ID → sửa → đọc lại → xóa → đọc lại trên backend thật. Xác nhận dữ liệu mới sau PATCH, DELETE trả `204` và GET sau xóa trả `404`. Kiểm tra thêm mã HTTP và cấu trúc lỗi cho đầu vào sai.
