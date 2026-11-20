-- GiftMate v2.2 | Du lieu demo, chay trong database giftmate sau tep 02.
BEGIN;

INSERT INTO giftmate.plan_limits (plan_type, limit_key, limit_value, unit)
VALUES ('FREE', 'recipient_limit', 5, 'nguoi'),
       ('FREE', 'ai_requests_per_day', 3, 'lan/ngay'),
       ('FREE', 'active_gift_ideas', 10, 'mon')
ON CONFLICT (plan_type, limit_key) DO NOTHING;

DO $$
DECLARE
    demo_user bigint;
    recipient bigint;
    event_id_demo bigint;
    occurrence bigint;
    gift bigint;
    notification bigint;
    device bigint;
    request bigint;
    suggestion bigint;
    event_date constant date := DATE '2026-12-20';
BEGIN
    INSERT INTO giftmate.users (email, auth_provider)
    VALUES ('demo@giftmate.example', 'EMAIL')
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO demo_user;

    IF demo_user IS NULL THEN
        RAISE NOTICE 'Tài khoản demo đã tồn tại. Bỏ qua các dòng demo của tài khoản.';
        RETURN;
    END IF;

    INSERT INTO giftmate.user_settings (user_id, display_name)
    VALUES (demo_user, 'Minh Anh');

    INSERT INTO giftmate.recipients (user_id, name, relationship, age_group, birth_day, birth_month, is_favourite)
    VALUES (demo_user, 'Ngọc Linh', 'FRIEND', 'ADULT', 20, 12, true)
    RETURNING id INTO recipient;

    INSERT INTO giftmate.recipient_preferences (recipient_id, category, value, polarity, confirmed_at)
    VALUES (recipient, 'Sở thích', 'Cà phê', 'LIKE', now()),
           (recipient, 'Chất liệu', 'Nhựa dùng một lần', 'AVOID', now());

    INSERT INTO giftmate.events (user_id, title, event_type, original_day, original_month, is_year_known, default_budget)
    VALUES (demo_user, 'Sinh nhật Ngọc Linh', 'BIRTHDAY', 20, 12, false, 600000)
    RETURNING id INTO event_id_demo;

    INSERT INTO giftmate.event_recipients (event_id, recipient_id, is_primary)
    VALUES (event_id_demo, recipient, true);

    INSERT INTO giftmate.event_occurrences (event_id, nominal_date, local_date, status)
    VALUES (event_id_demo, event_date, event_date, 'PREPARING')
    RETURNING id INTO occurrence;

    INSERT INTO giftmate.occurrence_recipients (occurrence_id, recipient_id)
    VALUES (occurrence, recipient);

    INSERT INTO giftmate.budgets (user_id, scope_type, scope_year, occurrence_id, amount)
    VALUES (demo_user, 'ANNUAL', 2026, NULL, 3000000),
           (demo_user, 'EVENT', NULL, occurrence, 600000);

    INSERT INTO giftmate.ai_requests (user_id, recipient_id, occurrence_id, budget_min, budget_max, status, completed_at)
    VALUES (demo_user, recipient, occurrence, 200000, 600000, 'GENERATED', now())
    RETURNING id INTO request;

    INSERT INTO giftmate.ai_suggestions (request_id, position, title, category, estimated_price_min, estimated_price_max)
    VALUES (request, 1, 'Bộ cà phê phin', 'Cà phê', 280000, 380000)
    RETURNING id INTO suggestion;

    INSERT INTO giftmate.ai_suggestions (request_id, position, title, category, estimated_price_min, estimated_price_max)
    VALUES (request, 2, 'Ly gốm thủ công', 'Đồ dùng', 180000, 280000),
           (request, 3, 'Phiếu trải nghiệm rang cà phê', 'Trải nghiệm', 550000, 600000);

    INSERT INTO giftmate.suggestion_feedback (suggestion_id, reason, detail)
    SELECT id, 'TOO_EXPENSIVE', 'Ưu tiên dành một phần ngân sách cho thiệp và gói quà.'
    FROM giftmate.ai_suggestions
    WHERE request_id = request AND position = 3;

    INSERT INTO giftmate.gifts (user_id, recipient_id, occurrence_id, suggestion_id, name, category, source, estimated_amount)
    VALUES (demo_user, recipient, occurrence, suggestion, 'Bộ cà phê phin', 'Cà phê', 'AI', 350000)
    RETURNING id INTO gift;

    UPDATE giftmate.gifts SET status = 'SELECTED' WHERE id = gift;
    UPDATE giftmate.gifts SET status = 'PURCHASED', purchased_on = event_date - 8 WHERE id = gift;

    INSERT INTO giftmate.expenses (user_id, gift_id, occurrence_id, expense_type, amount, occurred_at, description)
    VALUES (demo_user, gift, occurrence, 'GIFT', 320000, event_date - 8, 'Bộ cà phê phin'),
           (demo_user, gift, occurrence, 'SHIPPING', 30000, event_date - 8, 'Phí giao hàng'),
           (demo_user, gift, occurrence, 'WRAPPING', 20000, event_date - 8, 'Giấy và hộp gói quà');

    INSERT INTO giftmate.reminder_rules (event_id, days_before)
    VALUES (event_id_demo, 7), (event_id_demo, 0);

    INSERT INTO giftmate.notifications (user_id, occurrence_id, type, days_before, scheduled_at, deduplication_key)
    VALUES (demo_user, occurrence, 'PREPARE_GIFT', 7,
        ((event_date - 7) + TIME '09:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
        occurrence::text || ':PREPARE_GIFT:7')
    RETURNING id INTO notification;

    INSERT INTO giftmate.user_devices (user_id, installation_id, platform)
    VALUES (demo_user, 'giftmate-demo-device', 'ANDROID')
    RETURNING id INTO device;

    INSERT INTO giftmate.notification_deliveries (notification_id, device_id, status)
    VALUES (notification, device, 'PENDING');
END;
$$;

COMMIT;

-- Ket qua du kien khi chay lan dau: 370000 VND tren ngan sach 600000 VND.
SELECT o.local_date, e.title, b.amount AS budget, s.actual_spend, b.currency
FROM giftmate.v_occurrence_spend s
JOIN giftmate.event_occurrences o ON o.id = s.occurrence_id
JOIN giftmate.events e ON e.id = o.event_id
JOIN giftmate.users u ON u.id = s.user_id
JOIN giftmate.budgets b ON b.user_id = s.user_id AND b.occurrence_id = o.id
    AND b.scope_type = 'EVENT' AND b.currency = s.currency
WHERE u.email = 'demo@giftmate.example' AND e.title = 'Sinh nhật Ngọc Linh';
