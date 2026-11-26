# Auth

Module xử lý đăng ký, đăng nhập và cấp access token. Bắt đầu từ [code auth](../../../src/main/java/com/example/backend/auth/). Xem [backend README](../../../README.md) để chạy ứng dụng và thử API.

## Hiện trạng
- Đăng ký và đăng nhập trả access token cùng thông tin user. Backend hiện dùng access token, chưa có luồng refresh token.
- Auth dùng dữ liệu tài khoản của [module user](../user/README.md). Khi sửa thông tin user trong phản hồi hoặc cấu trúc token, kiểm tra cả nơi mobile sử dụng.
- Khi thay đổi xử lý lỗi, đối chiếu mã lỗi, HTTP status và quy ước lỗi trong [CONVENTIONS.md](../../../CONVENTIONS.md).

## Quyết định dùng cho các issue sau
Ghi quyết định đã được xác nhận tại đây khi phát sinh, kèm lý do và issue nguồn.

## Quyết định từ issue #10
- Đăng ký nhận `displayName`; `fullName` là alias tương thích cho request cũ. Auth trả `accessToken`, `tokenType`, `expiresIn` và `user`; phát hành, xoay và thu hồi refresh token thuộc #13, chưa có `refreshToken` trong phản hồi hiện tại.
- Google/Apple dùng ID token của provider và audience đã cấu hình. Nếu email trùng tài khoản khác, trả `409 EMAIL_ALREADY_USED`, không tự gộp; người dùng đăng nhập bằng phương thức ban đầu.
- Khi mất mạng, cho phép mở hồ sơ Free đã liên kết đến khi access token hết hạn; không thể phát hiện thu hồi trong lúc offline. Khi online nhận 401, yêu cầu xác thực lại. Dữ liệu quà vẫn ở SQLite trên máy; `/auth/sync` là dự kiến cho cloud, không thuộc luồng đăng nhập MVP.
