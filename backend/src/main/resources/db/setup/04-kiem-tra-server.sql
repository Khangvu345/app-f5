-- Chạy sau 02-server.sql. Toàn bộ dữ liệu thử nằm trong giao dịch được rollback.
BEGIN;
DO $$
DECLARE
    account_id bigint;
    oauth_id bigint;
    tables text[];
BEGIN
    SELECT array_agg(table_name::text ORDER BY table_name) INTO tables
    FROM information_schema.tables WHERE table_schema = 'giftmate' AND table_type = 'BASE TABLE';
    IF tables IS DISTINCT FROM ARRAY['refresh_tokens', 'user_settings', 'users'] THEN
        RAISE EXCEPTION 'Sai phạm vi bảng PostgreSQL giai đoạn 1: %', tables;
    END IF;

    INSERT INTO giftmate.users (email, password_hash, auth_provider)
    VALUES ('demo@example.test', 'example-digest', 'EMAIL') RETURNING id INTO account_id;
    INSERT INTO giftmate.user_settings (user_id, display_name) VALUES (account_id, 'An');
    IF (SELECT plan_type FROM giftmate.user_settings WHERE user_id = account_id) IS DISTINCT FROM 'FREE' THEN
        RAISE EXCEPTION 'Tài khoản mới phải có quyền Free';
    END IF;
    UPDATE giftmate.user_settings SET plan_type = 'PREMIUM' WHERE user_id = account_id;
    INSERT INTO giftmate.refresh_tokens (user_id, token_hash, expires_at)
    VALUES (account_id, 'example-token-digest', now() + interval '30 days');
    UPDATE giftmate.refresh_tokens SET revoked_at = now() WHERE user_id = account_id;

    INSERT INTO giftmate.users (auth_provider, provider_subject)
    VALUES ('APPLE', 'example-subject') RETURNING id INTO oauth_id;
    DELETE FROM giftmate.users WHERE id = account_id;
    IF EXISTS (SELECT 1 FROM giftmate.refresh_tokens WHERE user_id = account_id)
        OR EXISTS (SELECT 1 FROM giftmate.user_settings WHERE user_id = account_id)
        OR NOT EXISTS (SELECT 1 FROM giftmate.users WHERE id = oauth_id) THEN
        RAISE EXCEPTION 'Xóa tài khoản ảnh hưởng sai phạm vi';
    END IF;
END;
$$;
ROLLBACK;
SELECT 'Đạt kiểm tra PostgreSQL giai đoạn 1.' AS ket_qua;
