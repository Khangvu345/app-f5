# SQLite local cho GiftMate

Schema này cho phép mobile lưu người nhận, dịp, mốc nhắc, quà và chi tiêu trong một file SQLite cho mỗi hồ sơ. Khách có thể tạo dữ liệu ngay từ lần mở đầu tiên. Việc gắn tài khoản vào hồ sơ giữ nguyên dữ liệu và trạng thái đồng bộ mặc định tắt.

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

File mới có phiên bản `1`. Hàng hồ sơ là `1||0` (`slot = 1`, `server_user_id = NULL`, `sync_enabled = 0`). Kiểm tra khóa ngoại thành công trả về **0 dòng**. Để xem các bảng, chạy `sqlite3 "../giftmate-dev.sqlite" ".tables"`.

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
  onInit={(db) => db.execAsync('PRAGMA foreign_keys = ON')}
>
  {children}
</SQLiteProvider>
```

Import `SQLiteProvider` từ `expo-sqlite`. Nếu Metro chưa nhận file `.db`, thêm `db` vào `resolver.assetExts` của cấu hình Metro. Bản mẫu chỉ dùng khi mở một file mới. Khi người dùng khách liên kết tài khoản lần đầu, giữ `profileDbName` và ghi `server_user_id` vào `local_profile`. Khi đổi tài khoản, chọn file của đúng hồ sơ. [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) · [Cấu hình Metro](https://docs.expo.dev/guides/customizing-metro/)

## 4. Khi đổi schema

**SQLite trên điện thoại không cần Flyway.** Phiên bản nằm ở `PRAGMA user_version`. Ví dụ, khi nâng từ 1 lên 2, app đọc phiên bản lúc mở file, chạy các câu lệnh chuyển đổi trên dữ liệu hiện có và đặt `PRAGMA user_version = 2` trong cùng giao dịch. File mới dùng bản mẫu tương ứng. File đã có dữ liệu được nâng cấp tại chỗ.

**PostgreSQL trên server dùng Flyway.** Khi bổ sung bảng ánh xạ ID hoặc thay đổi schema server, tạo migration `V<n>__<mo_ta>.sql` với số phiên bản kế tiếp trong `db/migration/`. [Hướng dẫn Flyway của dự án](../../../../../../FLYWAY.md)
