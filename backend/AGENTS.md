# Làm việc với AI trong backend app-f5

## Nhận issue
Dev cung cấp mã issue, nguyên văn nhiệm vụ trên GitHub và thông tin bổ sung. Khi nhận issue mới, tạo thư mục `ai-docs/issues/` nếu cần và lưu `ai-docs/issues/<id>.md` theo [mẫu issue](ai-docs/_templates/ISSUE.md) trước khi code. Giữ nguyên phần yêu cầu gốc. Nếu file đã có, tiếp tục trên chính file đó. Ghi yêu cầu thay đổi vào phần bổ sung cùng người xác nhận.

## Đọc trước khi code
Khi cần nắm bài toán hoặc phạm vi nghiệp vụ, đọc [bối cảnh GiftMate](ai-docs/PROJECT.md). Bắt đầu ở README của module phụ trách ([auth](ai-docs/modules/auth/README.md), [user](ai-docs/modules/user/README.md)), phần liên quan trong [quy ước backend](CONVENTIONS.md), code và test hiện hành. Khi thay đổi ảnh hưởng contract, dữ liệu chung hoặc mobile, theo đường gọi đến phần bị ảnh hưởng và đối chiếu contract trên nhánh đang làm. Nếu yêu cầu rõ thì triển khai. Khi sửa lỗi hoặc tiếp nhận việc dở, chạy kiểm tra liên quan trước nếu cần xác định lỗi đã tồn tại.

## Xử lý phát sinh
Khi có lựa chọn làm thay đổi nghiệp vụ, API hoặc dữ liệu, nêu phương án và hệ quả để dev chốt. Câu hỏi còn mở ghi vào mục Tiếp việc. Quyết định chỉ áp dụng cho issue ghi ngay trong file issue cùng lý do và người chốt. Quyết định còn hiệu lực cho các issue sau ghi ở README module chịu trách nhiệm, rồi dẫn link từ issue. Phân biệt hướng đã chốt với hành vi đã triển khai. Với quy tắc dễ tái phát lỗi, dùng test phù hợp để kiểm chứng.

## Bàn giao và tiếp tục
Trước khi đổi phiên hoặc mở PR, cập nhật mục Tiếp việc ngay trong issue. Ghi kết quả, nhánh, mốc commit nếu có, phần chưa commit và bước tiếp theo. Ghi lệnh test, kết quả thực tế và phần chưa xác minh. Dev chuyển cả code lẫn file issue sang nhánh mà người tiếp việc có thể lấy. Phiên mới đọc issue và đối chiếu Git trước khi tiếp tục. Chỉ sửa README module khi hiện trạng hoặc quyết định dùng lâu dài thay đổi.

## Review
Từ backend chạy `./gradlew test` (PowerShell dùng `.\gradlew.bat test`) trước PR có thay đổi code backend. Xem [hướng dẫn chạy](README.md) và [quy trình PR](../CONTRIBUTING.md). Reviewer đối chiếu issue, diff và bằng chứng test. Với thay đổi quan trọng, dev có thể dùng phiên AI độc lập để tìm yêu cầu bị bỏ sót. GitHub quản lý trạng thái PR và merge.
