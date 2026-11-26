# Chạy thử schema PostgreSQL GiftMate

Image này tạo database `giftmate` và chạy `02-server.sql` khi khởi tạo dữ liệu lần đầu. Nó phục vụ kiểm thử bộ schema PostgreSQL. Backend hiện tại sử dụng database `appdb` và migration Flyway trong cấu hình Compose chính.

Từ thư mục gốc repo, tạo `.env` dựa trên `.env.example` và đặt `DB_PASSWORD`, sau đó chạy:

```sh
docker compose -f compose.postgresql.yml up -d --build
docker compose -f compose.postgresql.yml ps
```

Trong pgAdmin chạy trực tiếp trên máy, kết nối host `localhost`, cổng `5433`, user và mật khẩu trong `.env`, rồi mở database `giftmate`, schema `giftmate`. Với pgAdmin chạy trong container của Compose chính, dùng host `giftmate-schema-db` và cổng `5432` khi cả hai Compose dùng cùng project mặc định. Có thể đổi cổng host bằng biến `GIFTMATE_SCHEMA_DB_PORT`.

Kiểm tra các bảng và quy tắc bằng lệnh PowerShell từ gốc repo:

```powershell
Get-Content -Raw backend/src/main/resources/db/setup/04-kiem-tra-server.sql | docker compose -f compose.postgresql.yml exec -T giftmate-schema-db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Để nạp dữ liệu demo, thay đường dẫn file trong lệnh trên bằng `backend/src/main/resources/db/test-data/05-du-lieu-mau.sql`.

PostgreSQL chỉ chạy script khởi tạo trên volume mới. Khởi động lại giữ nguyên dữ liệu và không chạy lại script. `01-tao-database.sql` tạo database thủ công, còn image tạo `giftmate` qua `POSTGRES_DB`.

```sh
docker compose -f compose.postgresql.yml down
```

Lệnh này dừng container và giữ volume để dùng lại.
