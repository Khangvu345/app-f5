-- Bước 1/3 trên một kết nối riêng. Chạy tiếp 03-local.sql rồi 06-khoi-phuc-v2.sql.
-- Dừng ngay khi lỗi và rollback. FK được kiểm tra cả trước và sau khi dựng lại các bảng.
PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;
CREATE TEMP TABLE migration_check (ok INTEGER NOT NULL CHECK (ok = 1)) STRICT;
INSERT INTO migration_check SELECT user_version = 1 FROM pragma_user_version;
INSERT INTO migration_check SELECT foreign_keys = 0 FROM pragma_foreign_keys;
INSERT INTO migration_check SELECT NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check);

-- Lưu bản sao trước khi dựng schema. Mỗi bảng có miền ID riêng, kể cả khi UUID trùng giữa hai bảng.
CREATE TEMP TABLE v1_local_profile AS SELECT * FROM main.local_profile;
CREATE TEMP TABLE v1_app_settings_local AS SELECT * FROM main.app_settings_local;
CREATE TEMP TABLE v1_recipients AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.recipients;
CREATE UNIQUE INDEX temp.idx_v1_recipients ON v1_recipients(local_id);
CREATE TEMP TABLE v1_recipient_preferences AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.recipient_preferences;
CREATE UNIQUE INDEX temp.idx_v1_recipient_preferences ON v1_recipient_preferences(local_id);
CREATE TEMP TABLE v1_events AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.events;
CREATE UNIQUE INDEX temp.idx_v1_events ON v1_events(local_id);
CREATE TEMP TABLE v1_event_recipients AS SELECT * FROM main.event_recipients;
CREATE TEMP TABLE v1_event_occurrences AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.event_occurrences;
CREATE UNIQUE INDEX temp.idx_v1_event_occurrences ON v1_event_occurrences(local_id);
CREATE TEMP TABLE v1_occurrence_recipients AS SELECT * FROM main.occurrence_recipients;
CREATE TEMP TABLE v1_reminder_rules AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.reminder_rules;
CREATE UNIQUE INDEX temp.idx_v1_reminder_rules ON v1_reminder_rules(local_id);
CREATE TEMP TABLE v1_notification_schedules AS SELECT * FROM main.notification_schedules;
CREATE TEMP TABLE v1_gifts AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.gifts;
CREATE UNIQUE INDEX temp.idx_v1_gifts ON v1_gifts(local_id);
CREATE TEMP TABLE v1_budgets AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.budgets;
CREATE UNIQUE INDEX temp.idx_v1_budgets ON v1_budgets(local_id);
CREATE TEMP TABLE v1_expenses AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.expenses;
CREATE UNIQUE INDEX temp.idx_v1_expenses ON v1_expenses(local_id);
CREATE TEMP TABLE v1_occurrence_tasks AS SELECT row_number() OVER (ORDER BY local_id) AS id_v2, * FROM main.occurrence_tasks;
CREATE UNIQUE INDEX temp.idx_v1_occurrence_tasks ON v1_occurrence_tasks(local_id);
CREATE TEMP TABLE v1_draft_preferences AS SELECT * FROM main.draft_preferences;
CREATE TEMP TABLE v1_ai_draft AS SELECT * FROM main.ai_draft;
CREATE TEMP TABLE v1_ai_cache AS SELECT * FROM main.ai_cache;
CREATE TEMP TABLE v1_image_cache AS SELECT * FROM main.image_cache;
CREATE TEMP TABLE v1_sync_state AS SELECT * FROM main.sync_state;

-- Snapshot đồng bộ cũ có thể chứa UUID trong JSON. Giữ nguyên nội dung tại máy để đối chiếu.
DROP TRIGGER outbox_requires_opt_in;
DROP TRIGGER outbox_keep_snapshot;
ALTER TABLE sync_outbox RENAME TO legacy_sync_outbox_v1;
ALTER TABLE legacy_sync_outbox_v1 ADD COLUMN local_id_v2 INTEGER;

UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_recipients WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'recipients';
UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_recipient_preferences WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'recipient_preferences';
UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_events WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'events';
UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'event_occurrences';
UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_reminder_rules WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'reminder_rules';
UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_gifts WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'gifts';
UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_budgets WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'budgets';
UPDATE legacy_sync_outbox_v1 SET local_id_v2 =
    (SELECT id_v2 FROM v1_expenses WHERE local_id = legacy_sync_outbox_v1.local_id)
WHERE entity_type = 'expenses';

DROP VIEW v_actual_expenses;
DROP VIEW v_annual_spend;
DROP VIEW v_occurrence_spend;
DROP TABLE sync_state;
DROP TABLE image_cache;
DROP TABLE ai_cache;
DROP TABLE ai_draft;
DROP TABLE draft_preferences;
DROP TABLE occurrence_tasks;
DROP TABLE expenses;
DROP TABLE budgets;
DROP TABLE gifts;
DROP TABLE notification_schedules;
DROP TABLE reminder_rules;
DROP TABLE occurrence_recipients;
DROP TABLE event_occurrences;
DROP TABLE event_recipients;
DROP TABLE events;
DROP TABLE recipient_preferences;
DROP TABLE recipients;
DROP TABLE app_settings_local;
DROP TABLE local_profile;
