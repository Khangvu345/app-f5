# Flyway — README cho team GiftMate

> Flyway là **Git cho database**: mỗi thay đổi schema là một file migration có
> version, chạy theo thứ tự, và không bao giờ sửa file đã chạy.
> Tài liệu đầy đủ (10 mục, có case study lỗi thật ngày 17/11):
> `Huong_dan_Flyway_cho_team_GiftMate.docx`.
> Bài thực hành V3 kèm theo: `Thuc_hanh_Flyway_V3.md`.

## 1. Flyway chạy như thế nào trong dự án này

- **Không có nút bấm riêng, không cần chạy tay.** Flyway chạy tự động mỗi khi
  app Spring Boot khởi động (cả `./gradlew bootRun` lẫn container Docker).
- Mỗi lần khởi động, Flyway làm 4 việc theo đúng thứ tự:
  1. Kết nối database.
  2. **Validate** — so checksum của các migration đã chạy với file trên đĩa.
  3. Tìm migration **chưa chạy** (version lớn hơn version hiện tại).
  4. Chạy các migration đó theo thứ tự, trong transaction, rồi ghi vào bảng
     `flyway_schema_history`.
- Cấu hình (trong `backend/src/main/resources/application.yaml`):
  Flyway **enabled**, `ddl-auto: validate` — Flyway làm chủ schema, Hibernate
  chỉ kiểm tra (validate) entity có khớp bảng hay không, không tự tạo/sửa bảng.
- Stack: Spring Boot 4.1.1, Java 25, PostgreSQL 18, Flyway 12.4.0, Gradle.
  Migration nằm ở `backend/src/main/resources/db/migration/`.

## 2. Các migration hiện có

| Version | File | Nội dung | Trạng thái |
|---|---|---|---|
| V1 | `V1__create_users.sql` | Tạo bảng `users` (id `BIGINT GENERATED ALWAYS AS IDENTITY`) | Đã chạy |
| V2 | `V2__add_refresh_tokens.sql` | Thêm bảng `refresh_tokens` (API contract, login/refresh token) | Đã chạy |
| V3 | `V3__add_giftmate_account_schema.sql` | Mở rộng `public.users` cho EMAIL/Google/Apple, tạo `giftmate.user_settings` và điền tên hiển thị cho tài khoản cũ | Flyway tự chạy khi backend khởi động |
| V4 | `V4__add_giftmate_tables_to_public.sql` | Chuyển `user_settings` sang `public` và bổ sung 17 bảng, các view và trigger từ ERD PostgreSQL gốc | Flyway tự chạy khi backend khởi động |

Sau V4, cả 19 bảng ERD nằm trong schema `public` của `appdb`. V4 giữ dữ liệu `users`,
`refresh_tokens` và `user_settings` đã có. Với Docker, khởi động bằng `docker compose up -d --build`
để Flyway tự áp dụng các migration còn thiếu. `db/setup/02-server.sql` là bản SQL tham chiếu
của V4 cho database kiểm thử đã chạy V1–V3.

## 3. Muốn đổi schema thì làm gì (luồng chuẩn của team)

1. **Viết file migration mới** trong `backend/src/main/resources/db/migration/`,
   đặt tên đúng quy tắc: `V<version>__<mo_ta_ngan>.sql` — ví dụ `V5__mo_rong_schema_tiep_theo.sql`.
   - `V` + số version, **2 dấu gạch dưới** `__`, mô tả viết thường, gạch dưới ngăn cách.
   - Mỗi version chỉ dùng **một lần duy nhất** — version tiếp theo là số lớn nhất hiện có + 1.
   - Một file nên làm **một việc** (thêm 1 bảng, hoặc thêm 1 cột, …).
2. **Test ở máy mình trước**: chạy app (`./gradlew bootRun` hoặc `docker compose up -d`),
   xem log Flyway (3 dòng log mẫu ngay bên dưới) và kiểm tra bảng trong pgAdmin.
3. **Commit file migration cùng với code** dùng tới nó (entity, repository, API…).
   Migration được review như review code — xem mục 5.
4. **Merge / deploy**: app khởi động ở môi trường mới sẽ tự chạy migration.
   Không cần chạy tay thêm bước nào.

### Log cần thấy khi migration chạy đúng

```
Current version of schema "public": v3
Migrating schema "public" to version "4 - add giftmate tables to public"
Successfully applied 1 migration to schema "public", now at version v4
```

### Kiểm tra trong pgAdmin (http://localhost:5050)

- Trong `public.flyway_schema_history`, kiểm tra dòng `version = 4` có `success = true`.
- Trong `public`, kiểm tra 19 bảng ERD, gồm `users`, `user_settings`, `recipients`, `events` và `gifts`, cùng `refresh_tokens` của V2.
- Chạy `db/setup/04-kiem-tra-server.sql` trên database kiểm thử để xác nhận danh sách bảng và các ràng buộc.

## 4. Quy tắc vàng (đọc kỹ — vi phạm là hỏng DB)

1. **Không bao giờ sửa file migration đã chạy** trên DB dùng chung.
   Muốn sửa schema thì viết migration **mới** (V4, V5, …).
2. **Không dùng `flyway repair` để “chữa” schema.** `repair` chỉ sửa lại bảng
   lịch sử `flyway_schema_history`, nó **không sửa cấu trúc bảng thật**.
   Muốn sửa bảng thật thì viết migration mới.
3. **Rollback = viết migration mới** để hoàn tác thay đổi (ví dụ `DROP COLUMN`).
   Migration Undo (`U__...`) chỉ có ở bản trả phí (Teams/Enterprise),
   bản Community của dự án **không có Undo**.
4. **Không ghi secret** (mật khẩu, token, key) vào file migration.
5. **Không sửa tay trực tiếp trên DB rồi mới viết migration** — mọi thay đổi
   schema đều phải đi qua file migration, để máy khác chạy lại ra cùng một schema.

## 5. Checklist review migration (dùng khi review PR của nhau)

- [ ] Tên file đúng dạng `V<n>__<mo_ta>.sql`, version chưa từng dùng.
- [ ] Kiểu dữ liệu khớp với entity Java (đặc biệt: **mọi id đều là `BIGINT`**,
      khớp `Long` trong JPA — không dùng UUID cho id).
- [ ] Cột mới thêm vào bảng đã có dữ liệu: có `DEFAULT` hoặc cho `NULL`
      được không? (V3 đặt default `EMAIL`/`USER`/`ACTIVE` và backfill tên/gói cho user cũ.)
- [ ] Có khóa ngoại thì bảng cha và cột tham chiếu đã tồn tại, kiểu khớp nhau.
- [ ] Đã chạy thử ở máy mình, log Flyway báo success, kiểm tra `flyway_schema_history`.
- [ ] Không chứa secret, không sửa file V1/V2/V3 đã chạy.

## 6. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân (đã gặp thật ngày 17/11) | Cách xử lý |
|---|---|---|
| `Validate failed: Migration checksum mismatch for migration version 1` — applied `-1316351775`, resolved `-307975563` | File V1 đã chạy rồi nhưng bị sửa sau đó (đổi id từ UUID sang BIGINT) | **Không** sửa V1 nữa, **không** dùng `repair`. Ở máy dev: `docker compose down -v` (xóa DB, Flyway chạy lại V1+V2 mới) rồi `docker compose up -d db pgadmin` và chạy `bootRun`. Nếu vẫn tái diễn: image Docker backend còn chứa V1 cũ — rebuild image (`docker compose build --no-cache`) rồi `up -d` lại. |
| `Web server failed to start. Port 8080 was already in use` | Container backend đang chạy chiếm cổng 8080, `bootRun` local không mở được cổng | `docker compose stop backend` trước khi chạy `./gradlew bootRun`. |
| `FATAL: password authentication failed for user "app"` | Mật khẩu DB trong `backend/.env` khác mật khẩu lúc khởi tạo volume Postgres | Căn lại `backend/.env` khớp `POSTGRES_PASSWORD` trong `.env` gốc; nếu volume đã lưu mật khẩu cũ thì `docker compose down -v` rồi `up -d`. |
| `foreign key constraint ... are of incompatible types: bigint and uuid` | Kiểu id không khớp giữa 2 bảng (V1 UUID, V2 BIGINT) | Mọi id trong dự án đều là `BIGINT` — sửa migration (chỉ được sửa khi chưa chạy), rồi tạo lại DB dev. |

## 7. Giải thích cho team trong 30 giây

> “Flyway là Git cho database. Mỗi lần đổi bảng, mình viết một file `V...__.sql`
> mới, commit cùng code. App khởi động sẽ tự chạy file mới theo thứ tự và ghi
> lại vào bảng lịch sử. Quy tắc duy nhất cần nhớ: **không sửa file đã chạy** —
> muốn đổi gì thì viết file mới.”

## 8. Lệnh hay dùng

```bash
# Chay app local (tu thu muc backend/) — Flyway tu chay migration
./gradlew bootRun

# Chay bang Docker (tu thu muc goc repo app-f5)
docker compose up -d            # khoi dong db + pgadmin + backend
docker compose stop backend     # dung container backend truoc khi bootRun local
docker compose ps               # kiem tra container nao dang chay
docker compose down -v          # XOA SACH container + volume (mat het du lieu DB dev)
docker compose build --no-cache # build lai image backend khi nghi image cu
```
