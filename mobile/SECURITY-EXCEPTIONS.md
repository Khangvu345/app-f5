# Ngoại lệ bảo mật của ./mobile

## Zod · High · đang mở

- **Rủi ro.** Expo CLI kéo `zod@3.25.76` vào dự án. Khi kiểm tra một mảng quá lớn mà không giới hạn số phần tử, Zod có thể làm tiến trình hết bộ nhớ. [Cảnh báo GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) · [Lockfile đã kiểm tra](https://github.com/Khangvu345/app-f5/blob/83594a8c8f2b513911599ea2184bb443fbf50c42/mobile/package-lock.json)
- **Quyết định.** Nhóm tạm chấp nhận riêng cảnh báo này trên `dev` trong lúc thử bản cập nhật tương thích với Expo 58. Ảnh hưởng trong bản app phát hành còn cần xác minh. Reviewer xem riêng mọi cảnh báo High/Critical mới trước khi merge.
- **Theo dõi.** Nhóm cần chốt người phụ trách trước khi merge. Ngày rà lại đề xuất là **11/11/2026**.
- **Đóng ngoại lệ** khi bản vá đã vào `dev`, `npm audit` hết cảnh báo Zod này và `npm run check` đạt với cùng lockfile.
