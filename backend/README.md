# Backend

Backend sử dụng Java 25, Spring Boot, Gradle và PostgreSQL 18.

[Hướng dẫn dùng API GiftMate cho FE, BE và QA](../docs/api/README.md).

## Chạy backend bằng Docker

Đây là cách chạy chung của nhóm. Xem hướng dẫn tạo `.env`, khởi động database,
backend và pgAdmin trong [README gốc](../README.md).

Các lệnh Docker Compose dưới đây chạy tại **thư mục gốc repository**.

| Lệnh | Công dụng |
| --- | --- |
| `docker compose up -d --build` | Build và chạy các service |
| `docker compose ps` | Xem trạng thái các service |
| `docker compose logs -f backend` | Theo dõi log backend, nhấn `Ctrl+C` để thoát |
| `docker compose up -d --build backend` | Build lại và chạy backend |
| `docker compose down` | Dừng và xóa container, giữ volume dữ liệu |

## Lệnh Gradle thường dùng

Các lệnh trong phần này chạy tại thư mục `backend`. Máy cần có JDK 25.

| Công dụng | Windows PowerShell | Git Bash / Linux / macOS |
| --- | --- | --- |
| Xem phiên bản Gradle và JVM | `.\gradlew.bat --version` | `./gradlew --version` |
| Chạy test | `.\gradlew.bat test` | `./gradlew test` |
| Build và chạy kiểm tra | `.\gradlew.bat build` | `./gradlew build` |
| Tạo JAR Spring Boot | `.\gradlew.bat bootJar` | `./gradlew bootJar` |
| Xóa kết quả build | `.\gradlew.bat clean` | `./gradlew clean` |
| Chạy backend trên máy | `.\gradlew.bat bootRun` | `./gradlew bootRun` |

Kết quả build nằm trong `backend/build`. Báo cáo test HTML nằm tại
`backend/build/reports/tests/test/index.html`.

Trước khi mở PR có thay đổi backend, chạy `test` và kiểm tra kết quả.

## Chạy backend trên máy, dùng database Docker

Cách này dành cho khi cần chạy hoặc debug Java trực tiếp trên máy.

1. Tạo và điền `.env` ở gốc repo theo [README gốc](../README.md).
2. Tại gốc repo, chạy database và dừng backend container nếu đang chạy:

   ```bash
   docker compose up -d db
   docker compose stop backend
   ```

3. Sao chép `backend/.env.example` thành `backend/.env`.
4. Trong `backend/.env`, đặt `DB_HOST=localhost`. Các giá trị `DB_NAME`,
   `DB_USER`, `DB_PASSWORD` và `JWT_SECRET` phải khớp cấu hình đang dùng.
   `DB_PORT` phải bằng `DB_HOST_PORT` trong `.env` ở gốc repo. Nếu dùng mặc
   định thì cả hai là `5432`.
5. Mở terminal tại `backend`, chạy `bootRun` bằng lệnh trong bảng ở trên.

Backend container và backend chạy trên máy cùng dùng cổng `8080` theo mặc định.

## Cấu trúc

```
src/main/java/com/example/backend/
  BackendApplication.java
  config/    JwtProperties, JwtConfig (ký/kiểm tra JWT), SecurityConfig
  auth/      AuthController, AuthService, TokenService, dto/
  user/      User (entity), UserRepository, UserService, UserController
  common/    ApiException, ApiError, GlobalExceptionHandler
src/main/resources/
  application.yaml
  db/migration/                         # Flyway V1–V3, schema DB chính
  db/setup/02-server.sql                # Bản SQL thủ công tương ứng V3
```

Flyway áp dụng schema PostgreSQL khi backend khởi động. V3 mở rộng `public.users`,
tái sử dụng `public.refresh_tokens` từ V2 và tạo `giftmate.user_settings`.
Không chạy `02-server.sql` sau khi V3 đã áp dụng. Xem [hướng dẫn Flyway](../FLYWAY.md).

## API đã triển khai trong backend mẫu

| Method | Đường dẫn               | Auth   | Mô tả                                                           |
| ------ | ----------------------- | ------ | --------------------------------------------------------------- |
| POST   | `/api/v1/auth/register` | không  | Body `{displayName, email, password}` → `201 {accessToken, user}`  |
| POST   | `/api/v1/auth/login`    | không  | Body `{email, password}` → `200 {accessToken, user}`            |
| GET    | `/api/v1/users/me`      | Bearer | Trả `{id, email, fullName}`                                     |
| GET    | `/actuator/health`      | không  | Kiểm tra sống/chết                                              |

Lỗi trả về dạng `{timestamp, status, code, message, fieldErrors}`; app hiển thị trường `message`.
Mã lỗi chính: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401), `EMAIL_ALREADY_USED` (409).

Thử nhanh:

```bash
curl -X POST localhost:8080/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"displayName":"Test","email":"test@example.com","password":"password123"}'
```

## Ghi chú

- Mật khẩu băm bằng BCrypt (tối đa 72 ký tự do giới hạn của BCrypt).
- Email được chuẩn hóa về chữ thường trước khi lưu/so khớp.
- Hiện chỉ có access token (mặc định 1 giờ), chưa có refresh token.
- `JWT_SECRET` phải dài từ 32 ký tự; app sẽ không khởi động nếu ngắn hơn.
- Quy ước code: xem [CONVENTIONS.md](CONVENTIONS.md).
