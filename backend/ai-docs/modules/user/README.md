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

## Quyết định từ issue #13
- `displayName` và `planType` thuộc tài khoản server; múi giờ, ngôn ngữ, tiền tệ và tùy chọn nhắc thuộc SQLite của từng hồ sơ trên máy. `GET /users/me/settings` chỉ trả hai trường server; đổi tên qua `PATCH /users/me`.
- Server chỉ xuất phần tài khoản. Bàn giao FE: ghép dữ liệu quà và cài đặt của đúng hồ sơ trên máy, giữ khóa SQLite 64 bit ở dạng chuỗi thập phân. Không xuất mật khẩu hay token và không tải dữ liệu quà lên server.
- Xóa GĐ1 chỉ hỗ trợ tài khoản có mật khẩu. Sai mật khẩu trả `WRONG_PASSWORD` và giữ phiên; tài khoản không có mật khẩu trả `PASSWORD_NOT_AVAILABLE`. Tài khoản được xóa mềm, loại bỏ thông tin nhận dạng cá nhân và thu hồi phiên; tombstone còn lại mang trạng thái DELETED. FE cần tạo secret riêng cho lần xóa để đối soát khi mất phản hồi; `deleted: true` xác nhận thành công, `false` chưa chứng minh thất bại. Chỉ sau xác nhận mới dọn hồ sơ và lịch tương ứng; logout thông thường giữ dữ liệu.

- Đổi mật khẩu thành công thu hồi toàn bộ refresh token của tài khoản. Access token đã cấp còn hiệu lực đến hết hạn.
