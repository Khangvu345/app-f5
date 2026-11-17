# Android App — Monorepo

```
mobile/    React Native (Expo SDK 58, TypeScript)   → mobile/README.md · mobile/CONVENTIONS.md
backend/   Spring Boot 4.1.1, Java 25, PostgreSQL 18 → backend/README.md · backend/CONVENTIONS.md
```

Quy trình Git và commit: [CONTRIBUTING.md](CONTRIBUTING.md).

## Chạy backend + database bằng Docker 

Yêu cầu duy nhất: Docker Desktop đang chạy. Không cần cài Java hay PostgreSQL trên máy.

1. Copy `.env.example` thành `.env`, điền `DB_PASSWORD`, `JWT_SECRET`, `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`.
2. Chạy `docker compose up --build`.
3. Kiểm tra: `docker compose ps` báo `db` và `backend` đều `(healthy)`, `curl localhost:8080/actuator/health` trả `{"status":"UP"}`.
4. Mở pgAdmin ở http://localhost:5050, đăng nhập bằng `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` trong `.env`, rồi thêm server theo hướng dẫn ở dưới.
5. Dừng bằng `docker compose down`. Không thêm `-v` nếu muốn giữ dữ liệu, chỉ thêm `-v` khi muốn xóa sạch database và làm lại từ đầu.

### Thêm server vào pgAdmin (làm một lần duy nhất)

- Bấm Add New Server, tab General đặt Name là `app-f5 db`.
- Tab Connection điền: Host name/address là `db`, Port là `5432`, Username là giá trị `DB_USER` trong `.env`, Password là giá trị `DB_PASSWORD` trong `.env`, tích chọn Save password rồi Save.
- Host phải là `db`.
- Mở Servers > app-f5 db > Databases > appdb > Schemas > public > Tables, phải thấy bảng `users`.

## Chạy mobile trên host (kết nối tới backend trong Docker)

Mobile không chạy trong Docker. Backend và database chạy bằng Docker theo phần trên, mobile chạy trên máy phát triển và kết nối tới backend đó.

Yêu cầu: Node, Android Emulator mở từ Android Studio, hoặc điện thoại thật cùng mạng Wi-Fi/LAN với máy chạy backend và đã cài Expo Go.

1. Đảm bảo backend đã chạy bằng Docker theo phần trên.
2. Mở terminal mới, chạy:
   ```bash
   cd mobile
   cp .env.example .env
   npm ci
   npm run android
   ```
3. Đặt `EXPO_PUBLIC_API_BASE_URL` trong `mobile/.env` theo thiết bị đang dùng:
   - Emulator: `http://10.0.2.2:8080/api/v1`
   - Điện thoại thật: `http://<IP-LAN-của-máy-chạy-backend>:8080/api/v1`
