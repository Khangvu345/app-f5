# Quy ước code — Mobile (Expo + TypeScript)

Các quy ước dưới đây được **máy kiểm tra tự động** bằng ESLint, Prettier và TypeScript (strict). Trước khi tạo pull request chạy:

```bash
npm run check    # typecheck + lint + format:check + test
```

## 1. Công cụ và cách dùng

| Việc                          | Lệnh                                            |
| ----------------------------- | ----------------------------------------------- |
| Kiểm tra kiểu                 | `npm run typecheck`                             |
| Lint (không cho phép warning) | `npm run lint` · tự sửa: `npm run lint:fix`     |
| Định dạng                     | `npm run format` · chỉ kiểm tra: `format:check` |
| Test                          | `npm test` · `test:watch` · `test:coverage`     |

- Cấu hình: `eslint.config.js`, `.prettierrc`, `tsconfig.json`, `jest.config.js`, `../.editorconfig`.
- VS Code: mở thư mục `mobile/`, cài các extension được gợi ý (`.vscode/extensions.json`). Lưu file sẽ tự format và sửa lỗi ESLint.
- Prettier quyết định **mọi** vấn đề định dạng (nháy đơn, dấu chấm phẩy, 100 cột, trailing comma). Không tranh luận về format trong review.

## 2. Cấu trúc thư mục và phân tầng

```
src/
  app/            Route (Expo Router). Chỉ chứa màn hình và layout, mỏng.
  components/ui/  Component giao diện dùng lại, không biết nghiệp vụ.
  config/         Đọc cấu hình/env.
  services/       Giao tiếp bên ngoài: api/ (axios), storage/ (SecureStore).
  store/          State dùng chung (Zustand).
  theme/          Design token: màu, khoảng cách, cỡ chữ.
  types/          Kiểu dữ liệu dùng chung.
  utils/          Hàm tiện ích thuần.
```

Hướng phụ thuộc (chỉ import từ tầng bên dưới):

```
app → components, store, theme
store → services, types, utils
services → config, types, utils
components → theme
```

- Màn hình **không** gọi axios trực tiếp: gọi qua `services/api/*` hoặc store.
- Logic nghiệp vụ nằm ở `store`/`services`, không nằm trong JSX.
- Mỗi tính năng mới: thêm file API trong `services/api/`, kiểu trong `types/`, store nếu cần chia sẻ state, rồi mới làm màn hình.
- **Không đặt test hay file phụ trợ trong `src/app/`** — mọi file ở đó đều trở thành route.

## 3. Đặt tên

| Đối tượng                  | Quy tắc                                                   | Ví dụ                                          |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| File component             | `PascalCase.tsx`                                          | `Button.tsx`, `TextField.tsx`                  |
| File route                 | chữ thường theo URL (bắt buộc bởi router)                 | `login.tsx`, `(app)/profile.tsx`               |
| File khác                  | `kebab-case` + hậu tố vai trò                             | `api-error.ts`, `auth.store.ts`, `auth.api.ts` |
| File test                  | `<tên-file>.test.ts(x)` cạnh file gốc                     | `Button.test.tsx`                              |
| Biến, hàm, tham số         | `camelCase`                                               | `fetchProfile`                                 |
| Component, type, interface | `PascalCase`, **không** tiền tố `I`                       | `User`, `AuthState`                            |
| Hằng số cấp module         | `UPPER_SNAKE_CASE`                                        | `ACCESS_TOKEN_KEY`                             |
| Biến boolean               | tiền tố `is/has/can/should/will/did`                      | `isLoading`, `hasError`                        |
| Hook                       | tiền tố `use`                                             | `useAuthStore`                                 |
| Prop xử lý sự kiện         | `onXxx`; hàm xử lý bên trong: `handleXxx` hoặc `onSubmit` | `onPress`                                      |

Prop boolean của component được phép trùng tên API React Native (`disabled`, `loading`...).

## 4. TypeScript

- `strict: true`. **Cấm `any`**; dùng `unknown` rồi thu hẹp kiểu.
- Kiểu object: dùng `interface`; union, alias, kiểu tiện ích: dùng `type`.
- Không dùng `enum`; dùng union literal: `type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'`.
- Import kiểu bằng `import type { ... }` (ESLint tự sửa).
- Hàm export ở tầng `services/`, `utils/`, `store/` nên có kiểu trả về rõ ràng hoặc suy ra được một cách hiển nhiên.
- Không dùng `!` (non-null assertion) và `as` để "ép cho qua"; chỉ dùng `as` khi đã kiểm tra thực tế (ví dụ dữ liệu từ server).
- Bất đồng bộ: mọi Promise phải được `await`, trả về, hoặc đánh dấu `void` có chủ đích (`no-floating-promises`).

## 5. Import

- Dùng alias `@/` cho mọi thứ trong `src/`; chỉ dùng đường dẫn tương đối cho file cùng thư mục (`./Button`).
- Thứ tự (ESLint tự sắp xếp): thư viện ngoài → `@/...` → tương đối. Mỗi nhóm cách nhau một dòng trống, sắp theo bảng chữ cái.
- Không import vòng; cần "gọi ngược" thì dùng callback đăng ký (xem `setUnauthorizedHandler`).

## 6. React / React Native

- Chỉ dùng function component và hook. Mỗi file một component chính, `export default` cho route, `export function` có tên cho component dùng chung.
- Props khai báo bằng `interface Props` ngay trên component.
- Style: `StyleSheet.create` ở cuối file. **Không** viết style inline và **không** hard-code màu/khoảng cách/cỡ chữ — lấy từ `@/theme`.
- Danh sách: dùng `FlatList` (không `map` trong `ScrollView` với danh sách dài), luôn có `keyExtractor`.
- `useEffect`: khai báo đủ dependency (`exhaustive-deps` là lỗi). Dọn dẹp (cleanup) khi đăng ký listener/timer.
- Truy cập store bằng selector hẹp: `useAuthStore((s) => s.user)`, tránh lấy cả store.
- Trợ năng: phần tử bấm được có `accessibilityRole`; ảnh/icon có ý nghĩa có `accessibilityLabel`.
- Văn bản hiển thị cho người dùng viết bằng tiếng Việt, câu đầy đủ, nút bấm dùng động từ ("Đăng nhập", "Lưu thay đổi"). Khi thêm đa ngôn ngữ sẽ gom vào một nơi.

## 7. Gọi API và xử lý lỗi

- Mọi request đi qua `apiClient` (đã gắn token và chuẩn hóa lỗi). Mỗi nhóm endpoint một file `*.api.ts`, hàm trả về dữ liệu đã `.data`.
- Kiểu request/response khai báo trong `types/` và khớp với backend.
- Lỗi luôn được chuẩn hóa thành `ApiError` (`toApiError`). Màn hình hiển thị `error.message`; logic rẽ nhánh dựa vào `error.code`/`error.status`, không dựa vào nội dung message.
- Token chỉ lưu bằng `expo-secure-store`. Không lưu token hay dữ liệu nhạy cảm ở `AsyncStorage`, log hay state công khai.
- Không `console.log` (cảnh báo bị coi là lỗi); `console.warn`/`console.error` chỉ dùng khi thực sự cần.

## 8. Biến môi trường

- Chỉ đọc qua `src/config/env.ts`, không dùng `process.env` rải rác.
- Biến phải có tiền tố `EXPO_PUBLIC_` và **không bao giờ chứa bí mật** (có thể đọc được từ APK).
- Thêm biến mới: cập nhật `.env.example` và `env.ts` cùng lúc. Không commit `.env`.

## 9. Test

- Công cụ: Jest (`jest-expo`) + React Native Testing Library. Test đặt cạnh file được test, tên `*.test.ts(x)`.
- Bắt buộc có test cho: hàm trong `utils/`, store, và logic trong `services/`; component dùng lại có hành vi (bấm, nhập, hiển thị lỗi).
- Không cần test cho màn hình route thuần bố cục; nếu màn hình có luồng quan trọng (đăng nhập), nên có test tích hợp.
- Mỗi test: **Arrange – Act – Assert**, tên mô tả hành vi ("keeps the token when the failure is only a network error"), một ý chính cho mỗi test.
- Mock ở **ranh giới** (`services/api`, `token-storage`), không mock chính đối tượng đang test. Mỗi test độc lập; reset mock/store trong `beforeEach`.
- Truy vấn theo cách người dùng thấy: `getByRole`, `getByText`, `getByDisplayValue`; hạn chế `testID`.
- Sửa bug: viết test tái hiện lỗi trước.

## 10. Git, commit và pull request

Xem `../CONTRIBUTING.md` (Conventional Commits, đặt tên nhánh, checklist PR).
