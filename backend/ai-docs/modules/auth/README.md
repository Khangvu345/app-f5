# Auth

Module xử lý đăng ký, đăng nhập và cấp access token. Bắt đầu từ [code auth](../../../src/main/java/com/example/backend/auth/). Xem [backend README](../../../README.md) để chạy ứng dụng và thử API.

## Hiện trạng
- Đăng ký, đăng nhập và refresh trả access token, refresh token cùng thông tin user. Refresh token được lưu dạng hash, xoay một lần khi refresh và có hạn 30 ngày. Logout thu hồi refresh token gửi kèm của tài khoản; access token còn hiệu lực đến hết hạn.
- Auth dùng dữ liệu tài khoản của [module user](../user/README.md). Khi sửa thông tin user trong phản hồi hoặc cấu trúc token, kiểm tra cả nơi mobile sử dụng.
- Khi thay đổi xử lý lỗi, đối chiếu mã lỗi, HTTP status và quy ước lỗi trong [CONVENTIONS.md](../../../CONVENTIONS.md).

## Quyết định dùng cho các issue sau
Ghi quyết định đã được xác nhận tại đây khi phát sinh, kèm lý do và issue nguồn.

## Quyết định từ issue #10
- Đăng ký nhận `displayName`; `fullName` là alias tương thích cho request cũ. Auth trả `accessToken`, `refreshToken`, `tokenType`, `expiresIn` và `user`.
- Google/Apple dùng ID token của provider và audience đã cấu hình. Nếu email trùng tài khoản khác, trả `409 EMAIL_ALREADY_USED`, không tự gộp; người dùng đăng nhập bằng phương thức ban đầu.
- Bàn giao FE: khi mất mạng, cần cho phép mở hồ sơ Free đã liên kết đến khi access token hết hạn; không thể phát hiện thu hồi trong lúc offline. Khi online gặp 401 do phiên hết hạn, client cần thử refresh một lần; refresh không hợp lệ mới yêu cầu xác thực lại. Lỗi mạng cần giữ phiên và hồ sơ cục bộ. Dữ liệu quà vẫn ở SQLite trên máy; `/auth/sync` là dự kiến cho cloud, không thuộc luồng đăng nhập MVP.
