# Auth

Module xử lý đăng ký, đăng nhập và cấp access token. Bắt đầu từ [code auth](../../../src/main/java/com/example/backend/auth/). Xem [backend README](../../../README.md) để chạy ứng dụng và thử API.

## Hiện trạng
- Đăng ký và đăng nhập trả access token cùng thông tin user. Backend hiện dùng access token, chưa có luồng refresh token.
- Auth dùng dữ liệu tài khoản của [module user](../user/README.md). Khi sửa thông tin user trong phản hồi hoặc cấu trúc token, kiểm tra cả nơi mobile sử dụng.
- Khi thay đổi xử lý lỗi, đối chiếu mã lỗi, HTTP status và quy ước lỗi trong [CONVENTIONS.md](../../../CONVENTIONS.md).

## Quyết định dùng cho các issue sau
Ghi quyết định đã được xác nhận tại đây khi phát sinh, kèm lý do và issue nguồn.
