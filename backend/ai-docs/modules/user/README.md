# User

Module quản lý dữ liệu tài khoản và cung cấp thông tin người dùng đang đăng nhập. Bắt đầu từ [code user](../../../src/main/java/com/example/backend/user/).

## Hiện trạng
- UserRepository và UserService phục vụ truy cập dữ liệu tài khoản. [Auth](../auth/README.md) sử dụng dữ liệu này trong luồng đăng ký và đăng nhập.
- GET /api/v1/users/me yêu cầu Bearer token và trả thông tin của người dùng hiện tại. Khi thay đổi dữ liệu trả về, kiểm tra DTO, contract áp dụng và nơi mobile đọc phản hồi.
- Schema được quản lý qua [migration Flyway](../../../src/main/resources/db/migration/). Quy ước DTO và migration nằm trong [CONVENTIONS.md](../../../CONVENTIONS.md).

## Quyết định dùng cho các issue sau
Ghi quyết định đã được xác nhận tại đây khi phát sinh, kèm lý do và issue nguồn.

## Quyết định từ issue #10
- Biên API dùng ID tài khoản là chuỗi thập phân, cùng `displayName`, `role`, `status` và `planType`. Không chuyển ID qua kiểu số JavaScript. Role, status và planType được lưu cho từng tài khoản, giá trị mặc định lần lượt là USER, ACTIVE và FREE; tài khoản không ACTIVE nhận 401.
- Dữ liệu quà tặng thuộc SQLite theo hồ sơ trên thiết bị. Đăng nhập chỉ liên kết hoặc gộp dữ liệu khách cục bộ, không tải dữ liệu quà lên server; tài khoản trên máy khác không tự nhận dữ liệu quà.
