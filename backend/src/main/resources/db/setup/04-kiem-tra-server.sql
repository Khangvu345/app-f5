-- Chạy sau khi Flyway đã áp dụng V1–V4. Mọi dữ liệu thử được rollback.
BEGIN;

DO $$
DECLARE
    email_user_id bigint;
    oauth_user_id bigint;
    found_tables text[];
    person_id bigint;
    occasion_id bigint;
    instance_id bigint;
    gift_id_to_test bigint;
    total numeric;
BEGIN
    SELECT array_agg(table_name::text ORDER BY table_name) INTO found_tables
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('flyway_schema_history', 'refresh_tokens');
    IF found_tables IS DISTINCT FROM ARRAY[
            'ai_requests', 'ai_suggestions', 'budgets', 'event_occurrences',
            'event_recipients', 'events', 'expenses', 'gifts',
            'notification_deliveries', 'notifications', 'occurrence_recipients', 'plan_limits',
            'recipient_preferences', 'recipients', 'reminder_rules', 'suggestion_feedback',
            'user_devices', 'user_settings', 'users'
    ] THEN
        RAISE EXCEPTION 'Unexpected GiftMate tables in public: %', found_tables;
    END IF;
    IF to_regclass('public.refresh_tokens') IS NULL OR to_regnamespace('giftmate') IS NOT NULL THEN
        RAISE EXCEPTION 'Expected refresh_tokens in public and no extra giftmate schema';
    END IF;

    INSERT INTO public.users (email, password_hash, full_name)
    VALUES ('smoke@example.invalid', 'test-only-digest', 'Smoke test')
    RETURNING id INTO email_user_id;
    INSERT INTO public.user_settings (user_id, display_name)
    VALUES (email_user_id, 'Smoke test');
    IF (SELECT plan_type FROM public.user_settings WHERE user_id = email_user_id) IS DISTINCT FROM 'FREE' THEN
        RAISE EXCEPTION 'Tài khoản mới phải có quyền Free';
    END IF;
    UPDATE public.user_settings SET plan_type = 'PREMIUM' WHERE user_id = email_user_id;
    INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
    VALUES (email_user_id, 'smoke-token-digest', now() + interval '30 days');
    UPDATE public.refresh_tokens SET revoked_at = now() WHERE user_id = email_user_id;

    INSERT INTO public.users (email, password_hash, full_name, auth_provider, provider_subject)
    VALUES (NULL, NULL, 'OAuth smoke test', 'APPLE', 'smoke-provider-subject')
    RETURNING id INTO oauth_user_id;
    INSERT INTO public.recipients (user_id, name)
    VALUES (email_user_id, 'Smoke test recipient') RETURNING id INTO person_id;

    BEGIN
        INSERT INTO public.events (user_id, title, event_type, original_day, original_month)
        VALUES (email_user_id, 'Missing recipient', 'BIRTHDAY', 10, 5);
        SET CONSTRAINTS ALL IMMEDIATE;
        RAISE EXCEPTION 'An event without a recipient was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    INSERT INTO public.events (user_id, title, event_type, original_day, original_month)
    VALUES (email_user_id, 'Smoke test event', 'BIRTHDAY', 10, 5) RETURNING id INTO occasion_id;
    INSERT INTO public.event_recipients (event_id, recipient_id) VALUES (occasion_id, person_id);
    INSERT INTO public.event_occurrences (event_id, local_date)
    VALUES (occasion_id, DATE '2026-05-10') RETURNING id INTO instance_id;
    INSERT INTO public.occurrence_recipients (occurrence_id, recipient_id)
    VALUES (instance_id, person_id);
    SET CONSTRAINTS ALL IMMEDIATE;

    BEGIN
        DELETE FROM public.occurrence_recipients WHERE occurrence_id = instance_id;
        RAISE EXCEPTION 'The last occurrence recipient was removed';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    INSERT INTO public.gifts (user_id, recipient_id, occurrence_id, name, estimated_amount)
    VALUES (email_user_id, person_id, instance_id, 'Smoke test gift', 999)
    RETURNING id INTO gift_id_to_test;

    BEGIN
        UPDATE public.gifts SET status = 'GIVEN' WHERE id = gift_id_to_test;
        RAISE EXCEPTION 'Invalid gift status transition was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    UPDATE public.gifts SET status = 'SELECTED' WHERE id = gift_id_to_test;
    UPDATE public.gifts SET status = 'PURCHASED', purchased_on = DATE '2026-05-08'
    WHERE id = gift_id_to_test;

    INSERT INTO public.expenses (user_id, gift_id, occurrence_id, expense_type, amount, occurred_at)
    VALUES (email_user_id, gift_id_to_test, instance_id, 'GIFT', 100, DATE '2026-05-08'),
           (email_user_id, gift_id_to_test, instance_id, 'SHIPPING', 20, DATE '2026-05-08');
    SELECT actual_spend INTO total FROM public.v_occurrence_spend
    WHERE occurrence_id = instance_id AND currency = 'VND';
    IF total IS DISTINCT FROM 120 THEN
        RAISE EXCEPTION 'Expected actual spend 120 VND, got %', total;
    END IF;

    UPDATE public.gifts SET status = 'RETURNED' WHERE id = gift_id_to_test;
    IF EXISTS (SELECT 1 FROM public.v_occurrence_spend WHERE occurrence_id = instance_id) THEN
        RAISE EXCEPTION 'Returned gift was counted in actual spend';
    END IF;

    DELETE FROM public.users WHERE id = email_user_id;
    IF EXISTS (SELECT 1 FROM public.refresh_tokens WHERE user_id = email_user_id)
        OR EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = email_user_id)
        OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = oauth_user_id) THEN
        RAISE EXCEPTION 'Xóa tài khoản ảnh hưởng sai phạm vi';
    END IF;
END;
$$;

ROLLBACK;
SELECT 'Đạt kiểm tra schema PostgreSQL GiftMate trong public.' AS ket_qua;
