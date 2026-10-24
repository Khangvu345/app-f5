# Đóng góp và quy trình Git

## Nhánh

- `main`: luôn ở trạng thái chạy được. Không commit trực tiếp.
- Nhánh làm việc: `<loại>/<mô-tả-ngắn-kebab-case>`, ví dụ `feat/login-screen`, `fix/token-refresh`, `chore/update-deps`.
- Một nhánh = một mục đích; giữ pull request nhỏ và dễ review.

## Commit (Conventional Commits)

Dạng: `<loại>(<phạm vi>): <mô tả ngắn, thể mệnh lệnh, chữ thường, không dấu chấm cuối>`

| Loại       | Dùng khi                                  |
| ---------- | ----------------------------------------- |
| `feat`     | thêm tính năng                            |
| `fix`      | sửa lỗi                                   |
| `refactor` | đổi cấu trúc code, không đổi hành vi      |
| `test`     | thêm/sửa test                             |
| `docs`     | tài liệu                                  |
| `chore`    | cấu hình, thư viện, việc vặt              |
| `style`    | chỉ định dạng, không đổi logic            |
| `perf`     | cải thiện hiệu năng                       |

Phạm vi gợi ý: `mobile`, `backend`, hoặc tên tính năng (`auth`). Ví dụ:

- `feat(mobile): add register screen`
- `fix(backend): return 409 when email already exists`
- `chore(mobile): bump expo sdk`

Thay đổi phá vỡ tương thích: thêm `!` sau phạm vi (`feat(backend)!: ...`) và giải thích trong phần thân commit.

## Pull request — checklist

- [ ] Mô tả rõ làm gì và vì sao; ảnh chụp màn hình nếu đổi giao diện.
- [ ] Mobile: `npm run check` pass (typecheck, lint, format, test).
- [ ] Backend: `./gradlew test` pass.
- [ ] Đổi hợp đồng API thì cập nhật **cả hai phía** (backend và `mobile/src/types`, `services/api`).
- [ ] Thêm/đổi biến môi trường thì cập nhật `.env.example`; không có bí mật trong code.
- [ ] Có test cho logic mới hoặc bug đã sửa.
- [ ] Không còn `console.log`, code chú thích bỏ dở hay TODO không có người nhận.

## Review

- Review code, không review người. Nêu lý do và đề xuất cách sửa.
- Quy ước định dạng do máy kiểm tra; reviewer tập trung vào đúng/sai, thiết kế, bảo mật, test.
