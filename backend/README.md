# Backend (Spring Boot 4.1.1 · Java 25 · PostgreSQL 18)

Stack: Spring Boot 4.1.1 · Java 25 · Gradle (Kotlin DSL) · Spring Data JPA (Hibernate) · Flyway · Spring Security (JWT HS256) · PostgreSQL 18.

## Yêu cầu

- JDK 25 (Gradle toolchain sẽ tìm JDK 25 trên máy; cần cài sẵn hoặc bật tự tải toolchain).
- PostgreSQL 18 chạy trên máy (cần PostgreSQL 18 vì migration dùng hàm `uuidv7()` có sẵn từ bản 18).

## Chạy local

1. Tạo user và database (chạy bằng `psql -U postgres`):

   ```sql
   CREATE USER app WITH PASSWORD 'change-me-strong-password';
   CREATE DATABASE appdb OWNER app;
   ```

2. Tạo file cấu hình rồi chỉnh cho khớp (`DB_PASSWORD`, `JWT_SECRET`):

   ```bash
   cp .env.example .env
   ```

3. Chạy API (Flyway tự tạo bảng khi khởi động):

   ```bash
   ./gradlew bootRun        # http://localhost:8080
   ```

Chạy test: `./gradlew test`.

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
  db/migration/V1__create_users.sql   # Flyway: schema do migration quản lý (ddl-auto=validate)
```

## API (khớp với app mobile)

| Method | Đường dẫn               | Auth   | Mô tả                                                           |
| ------ | ----------------------- | ------ | --------------------------------------------------------------- |
| POST   | `/api/v1/auth/register` | không  | Body `{fullName, email, password}` → `201 {accessToken, user}`  |
| POST   | `/api/v1/auth/login`    | không  | Body `{email, password}` → `200 {accessToken, user}`            |
| GET    | `/api/v1/users/me`      | Bearer | Trả `{id, email, fullName}`                                     |
| GET    | `/actuator/health`      | không  | Kiểm tra sống/chết                                              |

Lỗi trả về dạng `{timestamp, status, code, message, fieldErrors}`; app hiển thị trường `message`.
Mã lỗi chính: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401), `EMAIL_ALREADY_USED` (409).

Thử nhanh:

```bash
curl -X POST localhost:8080/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"fullName":"Test","email":"test@example.com","password":"password123"}'
```

## Ghi chú

- Mật khẩu băm bằng BCrypt (tối đa 72 ký tự do giới hạn của BCrypt).
- Email được chuẩn hóa về chữ thường trước khi lưu/so khớp.
- Hiện chỉ có access token (mặc định 1 giờ), chưa có refresh token.
- `JWT_SECRET` phải dài từ 32 ký tự; app sẽ không khởi động nếu ngắn hơn.
- Quy ước code: xem [CONVENTIONS.md](CONVENTIONS.md).
