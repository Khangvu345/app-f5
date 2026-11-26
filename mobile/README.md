# Mobile (Expo + TypeScript)

Stack: Expo (managed) · TypeScript · Expo Router · Zustand · Axios · expo-secure-store · ESLint + Prettier · Jest.

[Hướng dẫn dùng API GiftMate cho FE, BE và QA](../docs/api/README.md).

[Cài đặt và kiểm tra SQLite local cho GiftMate](../backend/src/main/resources/db/setup/README-local.md).

## Cài đặt

```bash
npm ci
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
    (app)/             # tabs: index, profile (khách và tài khoản)
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
- Hợp đồng API và trạng thái triển khai nằm trong [hướng dẫn API](../docs/api/README.md); bộ đếm khách và hồ sơ SQLite được mô tả trong [bàn giao lưu trữ](../docs/api/local-storage.md).

## Thử đăng nhập Google và Apple

Cấu hình `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` bằng Web OAuth client ID; backend phải dùng cùng giá trị trong `GOOGLE_CLIENT_ID` để xác minh audience. Với Android, đăng ký OAuth Android client theo package và SHA-1 của khóa ký build trong Google Cloud. Với iOS, đăng ký iOS client theo bundle identifier và đặt `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; `app.config.js` tạo URL scheme từ client ID này. Các giá trị này là client ID công khai, không phải client secret. Nút Google chỉ hiện khi cấu hình cho nền tảng hiện tại đầy đủ. SDK Google là native module, cần development build hoặc release build, không chạy trong Expo Go.

Apple cần thiết bị iOS hỗ trợ Sign in with Apple, capability tương ứng và `EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED=true`; cấu hình `APPLE_CLIENT_ID` ở backend khớp audience của ID token. App tạo nonce, gửi hash cho Apple và gửi nonce gốc cùng ID token đến backend để xác minh. Nút Apple chỉ hiện trên iOS khi đã bật biến này.

`app.json` hiện dùng package, bundle identifier và scheme mẫu. Đăng ký định danh phù hợp với cấu hình provider, thay các giá trị mẫu cho build của dự án, rồi tạo development build tương ứng; thay đổi plugin hoặc cấu hình native yêu cầu build lại. Không đưa secret vào biến `EXPO_PUBLIC_*`. Cần kiểm tra trên thiết bị thật với cấu hình provider thật, bao gồm đăng nhập, hủy, tài khoản trùng email và khôi phục phiên; các kiểm tra này chưa được xác nhận chỉ bằng test tự động.
