-- Chạy sau khi Flyway đã áp dụng V1–V3. Mọi dữ liệu thử được rollback.
BEGIN;

DO $$
DECLARE
    email_user_id bigint;
    oauth_user_id bigint;
    found_tables text[];
BEGIN
    SELECT array_agg(table_name::text ORDER BY table_name) INTO found_tables
    FROM information_schema.tables
    WHERE table_schema = 'giftmate' AND table_type = 'BASE TABLE';
    IF found_tables IS DISTINCT FROM ARRAY['user_settings'] THEN
        RAISE EXCEPTION 'Sai phạm vi schema giftmate giai đoạn 1: %', found_tables;
    END IF;
    IF to_regclass('public.users') IS NULL OR to_regclass('public.refresh_tokens') IS NULL THEN
        RAISE EXCEPTION 'V3 cần các bảng public.users (V1) và public.refresh_tokens (V2)';
    END IF;

    INSERT INTO public.users (email, password_hash, full_name)
    VALUES ('smoke@example.invalid', 'test-only-digest', 'Smoke test')
    RETURNING id INTO email_user_id;
    INSERT INTO giftmate.user_settings (user_id, display_name)
    VALUES (email_user_id, 'Smoke test');
    IF (SELECT plan_type FROM giftmate.user_settings WHERE user_id = email_user_id) IS DISTINCT FROM 'FREE' THEN
        RAISE EXCEPTION 'Tài khoản mới phải có quyền Free';
    END IF;
    UPDATE giftmate.user_settings SET plan_type = 'PREMIUM' WHERE user_id = email_user_id;
    INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
    VALUES (email_user_id, 'smoke-token-digest', now() + interval '30 days');
    UPDATE public.refresh_tokens SET revoked_at = now() WHERE user_id = email_user_id;

    INSERT INTO public.users (email, password_hash, full_name, auth_provider, provider_subject)
    VALUES (NULL, NULL, 'OAuth smoke test', 'APPLE', 'smoke-provider-subject')
    RETURNING id INTO oauth_user_id;
    DELETE FROM public.users WHERE id = email_user_id;
    IF EXISTS (SELECT 1 FROM public.refresh_tokens WHERE user_id = email_user_id)
        OR EXISTS (SELECT 1 FROM giftmate.user_settings WHERE user_id = email_user_id)
        OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = oauth_user_id) THEN
        RAISE EXCEPTION 'Xóa tài khoản ảnh hưởng sai phạm vi';
    END IF;
END;
$$;

ROLLBACK;
SELECT 'Đạt kiểm tra PostgreSQL giai đoạn 1.' AS ket_qua;
