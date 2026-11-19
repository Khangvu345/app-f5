-- GiftMate — Migration V2: bảng refresh_tokens (Q6 — thêm refresh token)
--
-- Giả định: V1 là migration chứa toàn bộ schema v2.2
-- (GiftMate_DB_Schema_v2.2.sql). Nếu số version của V1 khác, đổi tên file này
-- tương ứng (vd V3__add_refresh_tokens.sql). Schema v2.2 chưa có bảng refresh
-- token nên phải thêm mới; endpoint POST /auth/refresh dùng bảng này.
--
-- Nguyên tắc: CHỈ lưu hash của token (SHA-256), KHÔNG lưu token gốc.
-- Khi refresh thành công: thu hồi token cũ (revoked_at = now()) và tạo token
-- mới (xoay vòng). Access token TTL 1h theo application.yaml; refresh token
-- hết hạn sau 30 ngày (do app quyết khi tạo, cột expires_at).
-- Dọn dẹp token hết hạn/thu hồi: job định kỳ ở tầng app (không thuộc migration).

CREATE TABLE refresh_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at)
  WHERE revoked_at IS NULL;
