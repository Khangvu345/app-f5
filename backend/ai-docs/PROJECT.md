# GiftMate — Bối cảnh sản phẩm

GiftMate là ứng dụng di động giúp người đi làm, các cặp đôi và gia đình chuẩn bị quà cho từng người và từng dịp. Người dùng dễ quên ngày quan trọng, để thất lạc ý tưởng hoặc mua sát ngày. Qua nhiều năm, họ cũng khó nhớ đã tặng ai món gì và đã chi bao nhiêu.

## Trải nghiệm cốt lõi

Người dùng tạo hồ sơ người nhận, thêm dịp đặc biệt, chọn mốc nhắc và lưu ý tưởng quà. Khi mua hoặc tặng, họ có thể ghi lại món quà và giá thực tế. Lịch sử theo người nhận giúp nhận ra món từng tặng và cung cấp dữ liệu tổng hợp chi tiêu.

## Lưu trữ dữ liệu trên thiết bị

Trong giai đoạn CRUD cơ bản, ứng dụng di động lưu và đọc dữ liệu quà tặng ngay trên thiết bị của người dùng, gồm hồ sơ người nhận, sự kiện, cấu hình nhắc, ý tưởng quà, ngân sách và lịch sử mua hoặc tặng thuộc phạm vi từng issue. Quy tắc này áp dụng cả khi dùng thử và sau khi đăng nhập. Để bảo vệ quyền riêng tư, cloud chỉ lưu thông tin cơ bản cần cho tài khoản và xác thực, trong giới hạn đã chốt ở ERD. Đăng nhập không kích hoạt tải dữ liệu quà tặng lên máy chủ.

Nhóm để việc lưu dữ liệu quà tặng trên cloud, sao lưu và đồng bộ giữa các thiết bị sang giai đoạn sau. Khi nhận issue CRUD, agent đối chiếu thực thể với ERD và xác định phần lưu trữ thuộc mobile trước khi đề xuất API hoặc bảng phía server.

## Phạm vi để giao việc

Nhóm đang ưu tiên CRUD cơ bản. Mỗi issue xác định phần cần triển khai và tiêu chí nghiệm thu. Danh sách dưới đây mô tả phạm vi nghiệp vụ của sản phẩm. Đối chiếu code, test và README module để biết phần đã chạy được trên nhánh hiện tại.

| Use case | Nội dung                                                                            |
| -------- | ----------------------------------------------------------------------------------- |
| UC-01    | Dùng thử trên thiết bị, đăng ký hoặc đăng nhập. Dữ liệu quà tặng tiếp tục lưu trên máy. |
| UC-02    | Chỉnh sửa hồ sơ tài khoản hoặc đăng xuất.                                           |
| UC-03    | Yêu cầu xuất dữ liệu cá nhân hoặc xác nhận xóa tài khoản.                           |
| UC-04    | Tạo và quản lý hồ sơ người nhận quà.                                                |
| UC-05    | Tìm người nhận theo tên và lọc theo mối quan hệ.                                    |
| UC-06    | Tạo sự kiện gắn với người nhận và thiết lập lặp lại khi cần.                        |
| UC-07    | Xem lịch tháng hoặc các sự kiện sắp tới.                                            |
| UC-08    | Chọn mốc nhắc và bật hoặc tắt thông báo cho sự kiện.                                |
| UC-09    | Lập ngân sách quà tặng và đặt hạn mức.                                              |
| UC-10    | Tổng hợp chi tiêu và cảnh báo khi vượt ngưỡng.                                      |
| UC-11    | Lưu ý tưởng quà thủ công, đường dẫn và giá dự kiến.                                 |
| UC-12    | Ghi nhận mua hoặc tặng quà, giá thực tế và lịch sử.                                 |
| UC-13    | Đối chiếu lịch sử để cảnh báo món quà trùng.                                        |
| UC-14    | Yêu cầu AI gợi ý quà theo người nhận và ngân sách.                                  |
| UC-15    | Phản hồi gợi ý hoặc lưu món phù hợp vào danh sách ý tưởng.                          |
| UC-16    | Admin xem nhật ký gọi AI và quản lý hạn mức.                                        |

Nhóm sẽ hoàn thiện Premium và hạn mức AI ở giai đoạn sau.

## Quy tắc liên quan nhiều phần

- Khách có thể quản lý người nhận, sự kiện, nhắc nhở và ý tưởng thủ công trên thiết bị. Luồng đăng nhập cần tính đến dữ liệu khách đã có trước đó.
- Hồ sơ người nhận yêu cầu tên và mối quan hệ. Sở thích có thể bổ sung sau.
- Ý tưởng quà có giá dự kiến. Việc ghi nhận mua hoặc tặng dùng giá thực tế cho lịch sử và tổng chi. Khi sửa luồng này, đối chiếu UC-09–13.
- Mức giá Premium, giới hạn thuê bao và liên kết cửa hàng trong bản ý tưởng là phương án tham khảo. Khi issue phụ thuộc một giá trị cụ thể, dùng giá trị nhóm đã chốt trong issue hoặc contract.

## Khi nhận issue

Dev cung cấp nguyên văn nhiệm vụ và các chi tiết nghiệp vụ cần cho issue. AI lưu chúng vào `issues/<id>.md` theo [mẫu issue](_templates/ISSUE.md). Dùng bảng trên để xác định use case liên quan. Nếu thiếu một điều kiện có thể làm thay đổi hành vi, hỏi dev về đúng điều kiện đó và ghi câu trả lời vào phần bổ sung của issue.

Hiện trạng backend nằm ở [folder module](/backend/ai-docs/modules/). Lệnh chạy và kiểm thử nằm trong [README backend](../README.md).
