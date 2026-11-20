BEGIN;

DO $$
DECLARE
    owner_id bigint;
    person_id bigint;
    occasion_id bigint;
    instance_id bigint;
    gift_id_to_test bigint;
    total numeric;
BEGIN
    IF (SELECT count(*) FROM information_schema.tables
        WHERE table_schema = 'giftmate' AND table_type = 'BASE TABLE') <> 19
       OR (SELECT count(*) FROM information_schema.columns c
           JOIN information_schema.tables t USING (table_schema, table_name)
           WHERE c.table_schema = 'giftmate' AND t.table_type = 'BASE TABLE') <> 213
       OR (SELECT count(*) FROM information_schema.table_constraints
           WHERE table_schema = 'giftmate' AND constraint_type = 'FOREIGN KEY') <> 30
       OR (SELECT count(*) FROM information_schema.views WHERE table_schema = 'giftmate') <> 3
    THEN
        RAISE EXCEPTION 'Unexpected GiftMate server schema counts';
    END IF;

    INSERT INTO giftmate.users DEFAULT VALUES RETURNING id INTO owner_id;
    INSERT INTO giftmate.recipients (user_id, name)
    VALUES (owner_id, 'Smoke test recipient') RETURNING id INTO person_id;

    BEGIN
        INSERT INTO giftmate.events (user_id, title, event_type, original_day, original_month)
        VALUES (owner_id, 'Missing recipient', 'BIRTHDAY', 10, 5);
        SET CONSTRAINTS ALL IMMEDIATE;
        RAISE EXCEPTION 'An event without a recipient was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    INSERT INTO giftmate.events (user_id, title, event_type, original_day, original_month)
    VALUES (owner_id, 'Smoke test event', 'BIRTHDAY', 10, 5) RETURNING id INTO occasion_id;
    INSERT INTO giftmate.event_recipients (event_id, recipient_id) VALUES (occasion_id, person_id);
    INSERT INTO giftmate.event_occurrences (event_id, local_date)
    VALUES (occasion_id, DATE '2026-05-10') RETURNING id INTO instance_id;
    INSERT INTO giftmate.occurrence_recipients (occurrence_id, recipient_id)
    VALUES (instance_id, person_id);
    SET CONSTRAINTS ALL IMMEDIATE;

    BEGIN
        DELETE FROM giftmate.occurrence_recipients WHERE occurrence_id = instance_id;
        RAISE EXCEPTION 'The last occurrence recipient was removed';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    INSERT INTO giftmate.gifts (user_id, recipient_id, occurrence_id, name, estimated_amount)
    VALUES (owner_id, person_id, instance_id, 'Smoke test gift', 999)
    RETURNING id INTO gift_id_to_test;

    BEGIN
        UPDATE giftmate.gifts SET status = 'GIVEN' WHERE id = gift_id_to_test;
        RAISE EXCEPTION 'Invalid gift status transition was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    UPDATE giftmate.gifts SET status = 'SELECTED' WHERE id = gift_id_to_test;
    UPDATE giftmate.gifts SET status = 'PURCHASED', purchased_on = DATE '2026-05-08'
    WHERE id = gift_id_to_test;

    INSERT INTO giftmate.expenses (user_id, gift_id, occurrence_id, expense_type, amount, occurred_at)
    VALUES (owner_id, gift_id_to_test, instance_id, 'GIFT', 100, DATE '2026-05-08'),
           (owner_id, gift_id_to_test, instance_id, 'SHIPPING', 20, DATE '2026-05-08');
    SELECT actual_spend INTO total FROM giftmate.v_occurrence_spend
    WHERE occurrence_id = instance_id AND currency = 'VND';
    IF total IS DISTINCT FROM 120 THEN
        RAISE EXCEPTION 'Expected actual spend 120 VND, got %', total;
    END IF;

    UPDATE giftmate.gifts SET status = 'RETURNED' WHERE id = gift_id_to_test;
    IF EXISTS (SELECT 1 FROM giftmate.v_occurrence_spend WHERE occurrence_id = instance_id) THEN
        RAISE EXCEPTION 'Returned gift was counted in actual spend';
    END IF;
END;
$$;

ROLLBACK;
SELECT 'GiftMate server smoke test passed.' AS result;
