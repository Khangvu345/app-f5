# GiftMate — Bối cảnh sản phẩm

GiftMate là ứng dụng di động giúp người đi làm, các cặp đôi và gia đình chuẩn bị quà cho từng người và từng dịp. Người dùng dễ quên ngày quan trọng, để thất lạc ý tưởng hoặc mua sát ngày. Qua nhiều năm, họ cũng khó nhớ đã tặng ai món gì và đã chi bao nhiêu.

## Trải nghiệm cốt lõi

Người dùng tạo hồ sơ người nhận, thêm dịp đặc biệt, chọn mốc nhắc và lưu ý tưởng quà. Khi mua hoặc tặng, họ có thể ghi lại món quà và giá thực tế. Lịch sử theo người nhận giúp nhận ra món từng tặng và cung cấp dữ liệu tổng hợp chi tiêu.

## Quyền sử dụng và phạm vi đã chốt ngày 23/11/2026

Khách dùng thử được cả khi ngoại tuyến. Mỗi bản cài có bốn hạn mức cộng dồn độc lập.

| Thao tác | Lượt dùng thử | Khi tính lượt |
| --- | ---: | --- |
| Tạo người nhận | 2 | Lưu thành công hồ sơ mới. |
| Tạo sự kiện | 3 | Lưu thành công sự kiện có người nhận. Các lần lặp dùng chung lượt của sự kiện gốc. |
| Đặt mốc nhắc | 3 | Thiết bị hẹn thành công lần đầu cho mốc đó. |
| Lưu ý tưởng thủ công | 5 | Lưu thành công ý tưởng mới. |

Xem, sửa, xóa và hẹn lại mốc đã tính đều giữ nguyên số lượt đã dùng. Khi hết lượt một loại, app mời đăng nhập ở lần tạo tiếp theo của loại đó. Khách vẫn xem được dữ liệu cũ và dùng các tính năng còn lượt.

Sau khi backend xác thực, Free mở đầy đủ UC-04–13. Trên cùng điện thoại, dữ liệu khách và lịch nhắc được giữ trong hồ sơ của tài khoản vừa đăng nhập. Nếu tài khoản đã có hồ sơ trên máy, app gộp dữ liệu khách một lần. Hai file SQLite v2 có thể cùng cấp một ID cho hai người khác nhau. Khi gộp, app ánh xạ ID theo bảng để giữ đúng người nhận của từng dịp, món quà và lịch nhắc. Mỗi tài khoản chỉ mở hồ sơ của mình. Khi phiên còn hạn, các tính năng cơ bản vẫn dùng được ngoại tuyến. Premium chỉ khác Free ở quyền và hạn mức AI.

## Lưu trữ dữ liệu trên thiết bị

Trong giai đoạn CRUD cơ bản, ứng dụng di động lưu và đọc dữ liệu quà tặng ngay trong SQLite theo từng hồ sơ trên điện thoại, gồm hồ sơ người nhận, sự kiện, cấu hình nhắc, ý tưởng quà, ngân sách và lịch sử mua hoặc tặng thuộc phạm vi từng issue. Quy tắc này áp dụng cả khi dùng thử và sau khi đăng nhập. Để bảo vệ quyền riêng tư, PostgreSQL chỉ lưu thông tin cơ bản cần cho tài khoản, xác thực và quyền sử dụng, trong giới hạn đã chốt ở ERD. Đăng nhập không kích hoạt tải dữ liệu quà tặng lên máy chủ.

Thiết kế SQL giai đoạn 1 và quy ước bàn giao ID 64 bit giữa các module nằm trong [ánh xạ ERD sang SQLite](../src/main/resources/db/setup/README-local.md).

Nhóm để việc lưu dữ liệu quà tặng trên cloud, sao lưu và đồng bộ giữa các thiết bị để xem xét sau. Khi nhận issue CRUD, agent đối chiếu thực thể với ERD và xác định phần lưu trữ thuộc mobile trước khi đề xuất API hoặc bảng phía server.

## Phạm vi để giao việc

Giai đoạn 1 triển khai song song xác thực và các tính năng cơ bản UC-01–13. Nhóm ghép thử sớm luồng khách tạo người nhận, sự kiện và mốc nhắc rồi đăng nhập Free trên cùng máy. Giai đoạn 2 ghép toàn bộ ứng dụng, triển khai AI và Admin (UC-14–16), nghiệm thu trên thiết bị thật. Phân công và mốc bàn giao nằm ở [issue #9](https://github.com/Khangvu345/app-f5/issues/9). Mỗi issue xác định phần cần triển khai và tiêu chí nghiệm thu. Danh sách dưới đây mô tả phạm vi nghiệp vụ của sản phẩm. Đối chiếu code, test và README module để biết phần đã chạy được trên nhánh hiện tại.

| Use case | Nội dung                                                                            |
| -------- | ----------------------------------------------------------------------------------- |
| UC-01    | Dùng thử trên thiết bị, đăng ký hoặc đăng nhập. Dữ liệu quà tặng tiếp tục lưu trên máy. |
| UC-02    | Chỉnh sửa hồ sơ tài khoản hoặc đăng xuất.                                           |
| UC-03    | Xuất JSON của hồ sơ hiện tại. Giai đoạn 1 chỉ nghiệm thu xóa tài khoản email bằng mật khẩu hiện tại.                           |
| UC-04    | Tạo và quản lý hồ sơ người nhận quà.                                                |
| UC-05    | Tìm người nhận theo tên và lọc theo mối quan hệ.                                    |
| UC-06    | Tạo sự kiện gắn với người nhận và thiết lập lặp lại khi cần.                        |
| UC-07    | Xem lịch tháng hoặc các sự kiện sắp tới.                                            |
| UC-08    | Chọn mốc nhắc và bật hoặc tắt thông báo cho sự kiện.                                |
| UC-09    | Lập ngân sách quà tặng và đặt hạn mức.                                              |
| UC-10    | Tổng hợp chi tiêu và cảnh báo khi chạm hoặc vượt ngưỡng.                                      |
| UC-11    | Lưu ý tưởng quà thủ công, đường dẫn và giá dự kiến.                                 |
| UC-12    | Ghi nhận mua hoặc tặng quà, giá thực tế và lịch sử.                                 |
| UC-13    | Đối chiếu lịch sử để cảnh báo món quà trùng.                                        |
| UC-14    | Điền biểu mẫu về người nhận, dịp, sở thích và ngân sách rồi bấm **Gợi ý sản phẩm** để nhận danh sách món quà.                                  |
| UC-15    | Phản hồi gợi ý hoặc lưu món phù hợp vào danh sách ý tưởng.                          |
| UC-16    | Admin xem nhật ký gọi AI và quản lý hạn mức.                                        |

Mỗi lần gửi biểu mẫu AI là một yêu cầu độc lập. Người dùng chọn từng sản phẩm để lưu vào SQLite hoặc gửi phản hồi. Chatbot nằm ngoài phạm vi UC-14–15. Free có 2 lượt AI mỗi ngày, tối đa 3 sản phẩm mỗi lượt. Nhóm sẽ chốt nhà cung cấp AI và hai hạn mức tương ứng của Premium trước khi bật AI thật.

Các quyết định để sau gồm nguồn dữ liệu sản phẩm, việc áp dụng RAG và cách xác nhận xóa tài khoản chỉ đăng nhập Google/Apple.

## Quy tắc liên quan nhiều phần

- Khách có thể quản lý người nhận, sự kiện, nhắc nhở và ý tưởng thủ công trên thiết bị. Luồng đăng nhập cần tính đến dữ liệu khách đã có trước đó.
- Hồ sơ người nhận yêu cầu tên và mối quan hệ. Sở thích có thể bổ sung sau.
- Ý tưởng quà có giá dự kiến. Việc ghi nhận mua hoặc tặng dùng giá thực tế cho lịch sử và tổng chi. Khi sửa luồng này, đối chiếu UC-09–13.
- Mức giá Premium, giới hạn thuê bao và liên kết cửa hàng trong bản ý tưởng là phương án tham khảo. Khi issue phụ thuộc một giá trị cụ thể, dùng giá trị nhóm đã chốt trong issue hoặc contract.

## Khi nhận issue

Dev cung cấp nguyên văn nhiệm vụ và các chi tiết nghiệp vụ cần cho issue. AI lưu chúng vào `issues/<id>.md` theo [mẫu issue](_templates/ISSUE.md). Dùng bảng trên để xác định use case liên quan. Nếu thiếu một điều kiện có thể làm thay đổi hành vi, hỏi dev về đúng điều kiện đó và ghi câu trả lời vào phần bổ sung của issue.

Hiện trạng backend nằm ở [folder module](/backend/ai-docs/modules/). Lệnh chạy và kiểm thử nằm trong [README backend](../README.md).
