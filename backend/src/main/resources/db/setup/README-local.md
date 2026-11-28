# SQLite local cho GiftMate

Schema này cho phép mobile lưu người nhận, dịp, mốc nhắc, quà và chi tiêu trong một file SQLite cho mỗi hồ sơ. Khách có thể tạo dữ liệu ngay từ lần mở đầu tiên. Việc gắn tài khoản vào hồ sơ giữ nguyên dữ liệu và trạng thái đồng bộ tắt trong GĐ1.

## 1. Chạy thử trên máy lập trình

Chạy các lệnh sau từ **thư mục gốc `app-f5`** bằng PowerShell hoặc Bash. Cần SQLite CLI hỗ trợ `STRICT` (từ 3.37) và hàm `json_valid`. Trên Windows, giải nén gói `sqlite-tools-win-x64`, thêm thư mục chứa `sqlite3.exe` vào `PATH` rồi mở lại PowerShell. Trên Ubuntu/WSL, có thể cài bằng `sudo apt install sqlite3`. [Tải SQLite](https://sqlite.org/download.html)

```sh
sqlite3 -bail ":memory:" "SELECT sqlite_version(), json_valid('{}');"
sqlite3 -bail ":memory:" ".read backend/src/main/resources/db/setup/03-local.sql" ".read backend/src/main/resources/db/setup/04-kiem-tra-local.sql"
```

Lệnh đầu trả phiên bản và giá trị `1`. Lệnh thứ hai tạo schema, thử luồng khách tạo người nhận và dịp, đặt nhắc, mua quà, kiểm tra tổng chi và ánh xạ ID. Kết quả mong đợi là **Đạt kiểm tra CRUD local GiftMate.** Dữ liệu thử nằm trong bộ nhớ.

## 2. Tạo database để dùng lại

Lệnh đầu tạo file **mới** cạnh thư mục repo. Chỉ chạy nó một lần cho từng file. Những lần sau, dùng lệnh thứ hai để mở lại và kiểm tra.

```sh
sqlite3 -bail "../giftmate-dev.sqlite" ".read backend/src/main/resources/db/setup/03-local.sql"
sqlite3 -bail "../giftmate-dev.sqlite" "PRAGMA foreign_keys = ON;" "PRAGMA user_version;" "SELECT slot, server_user_id, sync_enabled FROM local_profile;" "PRAGMA foreign_key_check;"
```

File mới có phiên bản `2`. Hàng hồ sơ là `1||0` (`slot = 1`, `server_user_id = NULL`, `sync_enabled = 0`). Kiểm tra khóa ngoại thành công trả về **0 dòng**. Để xem các bảng, chạy `sqlite3 "../giftmate-dev.sqlite" ".tables"`.

## 3. Khi tích hợp vào app Expo

Nhánh này cung cấp schema và bài kiểm tra. Để chạy CRUD trên điện thoại, team mobile cần nối tầng lưu trữ với `expo-sqlite`. Có thể dùng một database mẫu trống đóng gói cùng app. Chạy các lệnh sau từ gốc repo trên nhánh tích hợp mobile.

```sh
cd mobile
npx expo install expo-sqlite
sqlite3 -bail src/services/storage/giftmate-template.db ".read ../backend/src/main/resources/db/setup/03-local.sql"
```

Trong component đặt cạnh `giftmate-template.db`, mở file theo hồ sơ bằng `SQLiteProvider`. `profileDbName` là tên file ổn định do app quản lý. Dùng bản mẫu vừa tạo từ schema trống để dữ liệu thử trên máy dev không đi vào bản phát hành.

```tsx
<SQLiteProvider
  key={profileDbName}
  databaseName={profileDbName}
  assetSource={{ assetId: require('./giftmate-template.db') }}
  onInit={openProfile}
>
  {children}
</SQLiteProvider>
```

Hàm `openProfile` của tầng storage bật khóa ngoại và nâng phiên bản theo mục 4 trước khi các màn hình chạy CRUD. Import `SQLiteProvider` từ `expo-sqlite`. Nếu Metro chưa nhận file `.db`, thêm `db` vào `resolver.assetExts` của cấu hình Metro. Bản mẫu chỉ dùng khi mở một file mới. Khi người dùng khách liên kết tài khoản lần đầu, giữ `profileDbName` và ghi `server_user_id` vào `local_profile`. Khi đổi tài khoản, chọn file của đúng hồ sơ. [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) · [Cấu hình Metro](https://docs.expo.dev/guides/customizing-metro/)

## 4. Mở và nâng cấp file hồ sơ

Mỗi kết nối bật `PRAGMA foreign_keys = ON`. Với file trống, khởi tạo từ `03-local.sql` hoặc bản mẫu v2. Với file v2, mở trực tiếp. Với file v1, chạy lần lượt ba script trên **cùng một kết nối riêng** trước khi cho phép CRUD. File có phiên bản mới hơn cần phiên bản ứng dụng tương thích.

```sh
# Từ backend/src/main/resources/db/setup, trên file hồ sơ v1
sqlite3 -bail "ho-so.sqlite" ".read 05-chuan-bi-v1.sql" ".read 03-local.sql" ".read 06-khoi-phuc-v2.sql" "PRAGMA user_version;" "PRAGMA foreign_key_check;"
```

Trong Expo, đọc `user_version` rồi thực thi nội dung SQL theo cùng thứ tự. Script đầu giữ khóa ghi bằng `BEGIN IMMEDIATE` và kiểm tra lại phiên bản. Script giữa dùng savepoint để tạo đúng schema như file mới. Script cuối kiểm tra khóa ngoại trước khi commit. Khi có lỗi, dừng chuỗi lệnh, rollback giao dịch còn mở, bật lại khóa ngoại và đọc lại phiên bản trước khi thử lại. Đóng kết nối giữa chừng cũng rollback toàn bộ. Kết quả thành công là phiên bản 2 và 0 dòng lỗi FK.

Mỗi bảng có ánh xạ UUID cũ sang số nguyên dương riêng. Migration khôi phục cả hai bảng nối, người nhận chính, khóa ngoại tùy chọn, lịch hệ điều hành và lịch sử chi. `legacy_sync_outbox_v1` trên file nâng cấp giữ các snapshot v1 nguyên văn để đối chiếu. Bản ghi nguồn còn tồn tại có thêm `local_id_v2`. Hàng chờ v2 trống và `sync_enabled=0`. Các trường JSON của nháp/cache được bảo toàn nguyên văn. Ứng dụng dùng các cột FK đã chuyển đổi để ghép bản ghi.

## 5. Ánh xạ ERD v2.2 cho giai đoạn 1

| Nhóm dữ liệu trong ERD | Nơi lưu và quan hệ |
| --- | --- |
| Tài khoản, xác thực, quyền dịch vụ | PostgreSQL giữ `users`, `refresh_tokens` (hash của token), `user_settings` (tên hiển thị và gói). SQLite giữ một hàng `local_profile` cho mỗi file. `server_user_id` trống khi dùng thử, có giá trị khi liên kết tài khoản. |
| Người nhận, sở thích | SQLite giữ `recipients` và `recipient_preferences.recipient_id`. Phạm vi sở hữu là file hồ sơ, kể cả trước khi có tài khoản. |
| Dịp và lần diễn ra | SQLite giữ `events`, `event_recipients`, `event_occurrences` và `occurrence_recipients`. Hai bảng nối dùng khóa chính ghép. FK trì hoãn từ bản ghi cha tới thành viên giữ ít nhất một người nhận khi commit. `local_date` là ngày dương theo múi giờ sự kiện. |
| Quà, chi phí và ngân sách | SQLite giữ `gifts`, `expenses` và `budgets`. FK `occurrence_id` chỉ một lần diễn ra. Tổng năm và tổng theo dịp lấy từ ba view thực chi. Giá dự kiến thuộc món quà. |
| Quy tắc và lịch nhắc | SQLite giữ `reminder_rules` và `notification_schedules`. Mỗi cặp `(occurrence_id, days_before)` ứng với tối đa một lịch, `local_notification_id` là chuỗi do hệ điều hành cấp. GĐ1 hẹn trực tiếp trên thiết bị. |
| Tùy chọn, checklist và hạn mức thử | Tùy chọn lịch, hiển thị và đơn vị của hồ sơ nằm trong `app_settings_local`. Checklist dùng `occurrence_tasks`. Bộ đếm khách thuộc bản cài, do #10 quản lý bên ngoài file hồ sơ. |

Flyway V4 chuẩn bị đủ 19 bảng ERD PostgreSQL trong `appdb.public`. Sự hiện diện của các bảng này độc lập với luồng CRUD mobile, vốn đọc và ghi SQLite theo phạm vi GĐ1. Xem [hướng dẫn Flyway](../../../../../../FLYWAY.md) để khởi động và kiểm tra PostgreSQL.

### Quy ước giao ID, ngày và tiền

- `id BIGINT IDENTITY` của thực thể trong ERD ánh xạ sang `local_id INTEGER PRIMARY KEY` trong bảng SQLite `STRICT`. SQLite tự cấp ID dương theo từng bảng và file. Khi ghép hai hồ sơ, TV1/TV2 ánh xạ từng khóa nguồn sang khóa đích, gồm cả các khóa trong bảng nối và lịch. Dùng mã thao tác ổn định để thử lại sau gián đoạn.
- Ở biên SQLite/JavaScript và JSON xuất từ thiết bị, dùng chuỗi thập phân cho ID 64 bit. Ví dụ, đọc `CAST(local_id AS TEXT) AS local_id`, bind chuỗi ID vào truy vấn tham số. Khi tạo mới, dùng `INSERT ... RETURNING CAST(local_id AS TEXT) AS local_id`. Để SQLite tính số nguyên chính xác thay vì truyền qua JavaScript `Number`. ID tài khoản qua API cũng dùng chuỗi. ID hệ điều hành và mã thao tác là các giá trị độc lập với khóa nghiệp vụ.
- `NUMERIC(18,2)` ánh xạ sang `INTEGER` với hậu tố `_x100`. Ví dụ 320.000 VND lưu bằng 32000000. Ngày dùng `TEXT` dạng YYYY-MM-DD, thời điểm dùng UTC ISO 8601, múi giờ lưu theo tên IANA. Boolean dùng `INTEGER` với `CHECK (... IN (0,1))`.
