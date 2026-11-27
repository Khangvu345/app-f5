-- Tài khoản mẫu không có thông tin đăng nhập hợp lệ; chỉ để xem profile/gói trong DB.
BEGIN;

WITH demo AS (
    INSERT INTO public.users (email, password_hash, full_name, auth_provider)
    VALUES ('demo@giftmate.example', 'demo-only-not-a-login-hash', 'Minh Anh', 'EMAIL')
    ON CONFLICT (email) DO NOTHING
    RETURNING id
), account AS (
    SELECT id FROM demo
    UNION ALL
    SELECT id FROM public.users WHERE email = 'demo@giftmate.example'
    LIMIT 1
)
INSERT INTO giftmate.user_settings (user_id, display_name)
SELECT id, 'Minh Anh' FROM account
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
