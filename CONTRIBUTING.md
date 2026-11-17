# Hướng dẫn đóng góp cho app-f5

Tài liệu này hướng dẫn cách cài công cụ chung, tạo nhánh, viết commit và mở
pull request vào `dev`.

## 1. Chuẩn bị lần đầu

Cần có Git và Node.js 24 trên máy. Để chạy test backend trực tiếp trên máy,
cần thêm JDK 25.

Mở terminal tại thư mục gốc repository:

```bash
npm ci
```

Lệnh này cài commitlint và kích hoạt Git hook. Sau khi cài, Git sẽ kiểm tra
commit message mỗi khi bạn tạo commit.

Mobile có dependencies riêng. Nếu làm việc với mobile, chạy thêm:

```bash
cd mobile
npm ci
```

Hướng dẫn chạy hệ thống nằm trong [README gốc](README.md).

## 2. Quy trình làm việc

1. Cập nhật nhánh `dev`.
2. Tạo một nhánh mới cho nhiệm vụ.
3. Code và chạy kiểm tra tại máy.
4. Commit theo quy ước trong tài liệu này.
5. Push nhánh lên GitHub.
6. Mở pull request từ nhánh làm việc vào `dev`.
7. Kiểm tra CI và xử lý góp ý trước khi merge.

Ví dụ tạo nhánh:

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feat/login-screen
```

Nếu `dev` đã được mở trong worktree khác, dùng `git worktree list` để tìm
đúng thư mục trước khi chuyển nhánh.

Tên nhánh nên ngắn và thể hiện nhiệm vụ, ví dụ:

- `feat/login-screen`
- `fix/token-refresh`
- `docs/update-backend-readme`
- `chore/update-dependencies`

## 3. Quy ước commit

### Cấu trúc

```text
<type>(<scope>): <subject>
```

`scope` là tùy chọn. Ví dụ:

```text
feat(mobile): thêm màn hình đăng nhập
fix: sửa lỗi kiểm tra mật khẩu
docs(backend): hướng dẫn chạy test
```

- `type` mô tả loại thay đổi.
- `scope` mô tả phần bị ảnh hưởng, chẳng hạn `mobile`, `backend` hoặc `auth`.
- `subject` mô tả ngắn việc đã làm.

### Các loại commit

| Type | Khi nào dùng |
| --- | --- |
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `docs` | Thay đổi tài liệu |
| `style` | Thay đổi định dạng code, không đổi logic |
| `refactor` | Sửa cấu trúc code mà không thêm tính năng hoặc sửa lỗi |
| `perf` | Cải thiện hiệu năng |
| `test` | Thêm hoặc sửa test |
| `build` | Thay đổi hệ thống build hoặc dependency |
| `ci` | Thay đổi cấu hình hoặc script CI |
| `chore` | Công việc bảo trì và cấu hình khác |
| `revert` | Hoàn tác thay đổi trước đó |

### Quy tắc được công cụ kiểm tra

1. `type` phải thuộc bảng trên và viết thường.
2. `subject` phải có nội dung và không kết thúc bằng dấu chấm.
3. Không bắt đầu `subject` bằng kiểu chữ hoa như `Some message`,
   `Some Message`, `SomeMessage` hoặc `SOMEMESSAGE`.
4. Dòng đầu của commit tối đa 100 ký tự và không có khoảng trắng thừa ở cuối.
5. Mỗi dòng của body hoặc footer tối đa 100 ký tự.
6. Nên để một dòng trống trước body hoặc footer. Thiếu dòng trống được báo
   warning theo cấu hình hiện tại.

Ví dụ đúng:

```text
feat(mobile): thêm màn hình đăng nhập
fix(auth): kiểm tra mật khẩu
fix: sửa lỗi kết nối
ci: chạy test backend
```

Ví dụ sai:

```text
FEAT(mobile): thêm màn hình
fix(auth):
fix: Sửa lỗi kết nối
docs: cập nhật hướng dẫn.
update: sửa giao diện
```

Commitlint có thể bỏ qua một số commit tự sinh theo mẫu mặc định, chẳng hạn
một số merge commit, revert commit và commit version. Các commit do thành
viên chủ động tạo vẫn nên theo cấu trúc ở trên.

### Body và thay đổi phá vỡ tương thích

Khi cần giải thích thêm, viết body sau một dòng trống:

```text
fix(auth): xử lý token hết hạn

Chuyển người dùng về màn hình đăng nhập khi token không còn hiệu lực.
```

Với thay đổi phá vỡ tương thích, dùng `!` và giải thích ảnh hưởng trong
footer `BREAKING CHANGE`:

```text
feat(api)!: thay đổi cấu trúc phản hồi đăng nhập

BREAKING CHANGE: trường token được đổi thành accessToken.
```

Khi thay đổi hợp đồng API, người thực hiện cần phối hợp cập nhật mobile và
backend.

## 4. Kiểm tra tại máy

### Mobile

Từ thư mục `mobile`:

```bash
npm run check
```

Lệnh này chạy TypeScript, ESLint, Prettier và test.

### Backend

Từ thư mục `backend`:

```bash
./gradlew test
```

Trên Windows PowerShell:

```powershell
.\gradlew.bat test
```

Các lệnh backend khác nằm trong [backend/README.md](backend/README.md).

### Commit message

Hook chạy tự động khi dùng `git commit`. Nếu commit bị từ chối, đọc thông báo,
sửa message rồi chạy lại lệnh commit.

Có thể kiểm tra thủ công một message từ gốc repo:

```bash
echo "feat(mobile): thêm màn hình đăng nhập" | npx --no -- commitlint --verbose
```

## 5. Mở pull request

Trước khi mở PR:

- [ ] Đã xem lại các file thay đổi bằng `git diff`.
- [ ] Đã chạy kiểm tra phù hợp với phần việc.
- [ ] Đã cập nhật tài liệu hoặc `.env.example` nếu cần.
- [ ] Không đưa mật khẩu, token hoặc file `.env` thật vào commit.
- [ ] Có test cho logic mới hoặc lỗi đã sửa khi phù hợp.
- [ ] Đã mô tả PR làm gì, vì sao và cách kiểm tra.
- [ ] Đính kèm ảnh nếu thay đổi giao diện.

Trên GitHub, chọn nhánh đích là `dev`. Kiểm tra các job:

- `commit-check` kiểm tra commit message.
- `mobile-check` kiểm tra mobile.
- `backend-check` chạy test backend.
- `security-audit` báo cáo dependency mobile để reviewer xem xét.

Nếu chọn **Squash and merge**, viết squash commit message theo quy ước ở trên.

## 6. Nguồn tham khảo

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitlint config-conventional](https://github.com/conventional-changelog/commitlint/tree/v19.8.1/%40commitlint/config-conventional)
- [Commitlint local setup](https://commitlint.js.org/guides/local-setup.html)
