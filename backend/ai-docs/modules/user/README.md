# User

Module quản lý dữ liệu tài khoản và cung cấp thông tin người dùng đang đăng nhập. Bắt đầu từ [code user](../../../src/main/java/com/example/backend/user/).

## Hiện trạng
- UserRepository và UserService phục vụ truy cập dữ liệu tài khoản. [Auth](../auth/README.md) sử dụng dữ liệu này trong luồng đăng ký và đăng nhập.
- GET /api/v1/users/me yêu cầu Bearer token và trả thông tin của người dùng hiện tại. Khi thay đổi dữ liệu trả về, kiểm tra DTO, contract áp dụng và nơi mobile đọc phản hồi.
- Schema được quản lý qua [migration Flyway](../../../src/main/resources/db/migration/). Quy ước DTO và migration nằm trong [CONVENTIONS.md](../../../CONVENTIONS.md).

## Quyết định dùng cho các issue sau
Ghi quyết định đã được xác nhận tại đây khi phát sinh, kèm lý do và issue nguồn.
