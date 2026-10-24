# Mobile (Expo + TypeScript)

Stack: Expo (managed) · TypeScript · Expo Router · Zustand · Axios · expo-secure-store · ESLint + Prettier · Jest.

## Cài đặt

```bash
npm install
cp .env.example .env        # rồi chỉnh EXPO_PUBLIC_API_BASE_URL
npm run android             # hoặc: npm start rồi mở bằng Expo Go
```

Phiên bản thư viện đã được ghim theo Expo SDK 58. Khi nâng cấp SDK, dùng `npx expo install --fix` để căn chỉnh lại.

## Lệnh thường dùng

| Lệnh                                        | Công dụng                                 |
| ------------------------------------------- | ----------------------------------------- |
| `npm run lint` / `lint:fix`                 | ESLint (không cho phép warning) / tự sửa  |
| `npm run format` / `format:check`           | Prettier: định dạng / chỉ kiểm tra        |
| `npm run typecheck`                         | TypeScript strict                         |
| `npm test` / `test:watch` / `test:coverage` | Jest + React Native Testing Library       |
| `npm run check`                             | Chạy cả bốn bước trên (dùng trước khi PR) |

Quy ước code đầy đủ: [CONVENTIONS.md](CONVENTIONS.md).

## Cấu trúc

```
src/
  app/                 # Expo Router (file-based)
    _layout.tsx        # root: hydrate session + route guard (Stack.Protected)
    (auth)/            # login, register (chỉ khi chưa đăng nhập)
    (app)/             # tabs: index, profile (chỉ khi đã đăng nhập)
  components/ui/       # Button, TextField, Screen
  config/env.ts        # đọc biến EXPO_PUBLIC_*
  services/api/        # axios client (+interceptor token/401), auth.api
  services/storage/    # token-storage (SecureStore)
  store/               # Zustand stores
  theme/               # design tokens (placeholder)
  types/ utils/
  *.test.ts(x)         # test đặt cạnh file được test (không đặt trong src/app)
```

## Ghi chú

- Alias import: `@/` → `src/`.
- Emulator Android gọi máy host qua `10.0.2.2`; thiết bị thật dùng IP LAN của máy chạy backend.
- Build release dùng HTTPS; HTTP thuần chỉ nên dùng khi phát triển.
- Chỉ biến có tiền tố `EXPO_PUBLIC_` được đưa vào bundle, tuyệt đối không để secret trong `.env` của app.
- Hợp đồng API (đường dẫn `/auth/login`, `/auth/register`, `/users/me`, dạng `AuthResponse`) là đề xuất, sẽ đồng bộ với backend ở Phase 2.
