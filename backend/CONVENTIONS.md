# Quy ước code — Backend

## Công cụ

- Java 25, Gradle Kotlin DSL, indent 4 spaces (xem `.editorconfig` ở thư mục gốc repo).
- Thêm thư viện: khai báo trong `build.gradle.kts`, ưu tiên phiên bản do Spring Boot BOM quản lý (không ghi version).

## Đặt tên

- Package: chữ thường, theo **tính năng** (`auth`, `user`), không theo tầng kỹ thuật.
- Class/record/interface: `PascalCase`. Method/biến: `camelCase`. Hằng số: `UPPER_SNAKE_CASE`.
- Hậu tố theo vai trò: `...Controller`, `...Service`, `...Repository`, `...Request`/`...Response` (DTO), `...Properties` (cấu hình), `...Exception`.
- Bảng/cột DB: `snake_case`, tên bảng số nhiều (`users`). Migration Flyway: `V<số>__<mô_tả_snake_case>.sql`.
- Đường dẫn API: `/api/v1/<tài-nguyên-số-nhiều>`, chữ thường, dùng gạch ngang nếu nhiều từ.

## Phân tầng

- `Controller` chỉ nhận request, validate, gọi `Service`, trả DTO. Không chứa nghiệp vụ.
- `Service` chứa nghiệp vụ và ranh giới `@Transactional` (đọc: `readOnly = true`).
- `Repository` chỉ truy cập dữ liệu.
- **Không trả entity ra ngoài API**: luôn dùng DTO (`record`). Không bao giờ để lộ `passwordHash`.
- DTO là `record`, validate bằng Jakarta Validation (`@NotBlank`, `@Size`...), thông báo lỗi tiếng Việt, hiển thị được cho người dùng.

## Lỗi

- Lỗi nghiệp vụ: ném `ApiException` với `HttpStatus`, `code` ổn định (`UPPER_SNAKE_CASE`) và `message` thân thiện.
- Mọi lỗi trả về qua `GlobalExceptionHandler` theo dạng `ApiError`. Không để lộ stack trace hay chi tiết nội bộ.

## Dữ liệu

- Schema chỉ thay đổi bằng migration Flyway mới; **không sửa migration đã chạy**. Hibernate để `ddl-auto: validate`.
- Entity: constructor `protected` không tham số cho JPA, không dùng setter công khai nếu không cần.
- Thời gian lưu `Instant` (UTC) ↔ `TIMESTAMPTZ`.

## Cấu hình và bảo mật

- Giá trị thay đổi theo môi trường hoặc bí mật: đọc từ biến môi trường qua `application.yaml`, khai báo mẫu trong `.env.example`. Không commit `.env`.
- Cấu hình có cấu trúc dùng `@ConfigurationProperties` (record) thay vì `@Value`.
- Không log mật khẩu, token hay dữ liệu cá nhân.

## Test

- Test đặt trong `src/test/java` cùng package với lớp được test, tên `<Lớp>Test`.
- Tên method mô tả hành vi: `generatedTokenCanBeDecodedAndCarriesUserClaims`.
- Chạy `./gradlew test` trước khi tạo pull request.

## Git

Xem `CONTRIBUTING.md` ở thư mục gốc (Conventional Commits, đặt tên nhánh, checklist PR).
