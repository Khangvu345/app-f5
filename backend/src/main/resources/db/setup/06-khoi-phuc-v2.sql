-- Bước 3/3, chạy ngay sau 05-chuan-bi-v1.sql và 03-local.sql trong giao dịch đang mở.
INSERT INTO migration_check SELECT user_version = 2 FROM pragma_user_version;
UPDATE local_profile SET
    server_user_id = (SELECT server_user_id FROM v1_local_profile),
    pull_cursor = (SELECT pull_cursor FROM v1_local_profile)
WHERE slot = 1;

-- Chép thành viên trước bản ghi cha để các trigger của bảng nối không tăng local_rev khi chuyển đổi.
INSERT INTO event_recipients (
    event_id, recipient_id, is_primary
)
SELECT
    (SELECT id_v2 FROM v1_events WHERE local_id = old.event_id),
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.recipient_id),
    old.is_primary
FROM v1_event_recipients AS old;

INSERT INTO occurrence_recipients (
    occurrence_id, recipient_id
)
SELECT
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = old.occurrence_id),
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.recipient_id)
FROM v1_occurrence_recipients AS old;

INSERT INTO app_settings_local SELECT * FROM v1_app_settings_local;

INSERT INTO recipients (
    local_id, server_id, server_version, name, relationship, relationship_detail, age_group,
    birth_day, birth_month, birth_year, notes, is_favourite, created_at, updated_at, deleted_at,
    local_rev, acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version, old.name, old.relationship, old.relationship_detail,
    old.age_group, old.birth_day, old.birth_month, old.birth_year, old.notes, old.is_favourite,
    old.created_at, old.updated_at, old.deleted_at, old.local_rev, old.acked_local_rev
FROM v1_recipients AS old;

INSERT INTO recipient_preferences (
    local_id, server_id, server_version, recipient_id, category, value, polarity, source,
    confirmed_at, is_active, created_at, updated_at, deleted_at, local_rev, acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version,
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.recipient_id),
    old.category, old.value, old.polarity, old.source, old.confirmed_at, old.is_active, old.created_at,
    old.updated_at, old.deleted_at, old.local_rev, old.acked_local_rev
FROM v1_recipient_preferences AS old;

INSERT INTO events (
    local_id, server_id, server_version, anchor_recipient_id, title, event_type, occasion_type,
    calendar_type, original_day, original_month, original_year, is_lunar_leap_month,
    recurrence_frequency, leap_day_policy, timezone, start_date, end_date, default_budget_x100,
    notes, created_at, updated_at, deleted_at, local_rev, acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version,
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.anchor_recipient_id),
    old.title, old.event_type, old.occasion_type, old.calendar_type, old.original_day,
    old.original_month, old.original_year, old.is_lunar_leap_month, old.recurrence_frequency,
    old.leap_day_policy, old.timezone, old.start_date, old.end_date, old.default_budget_x100, old.notes,
    old.created_at, old.updated_at, old.deleted_at, old.local_rev, old.acked_local_rev
FROM v1_events AS old;

INSERT INTO event_occurrences (
    local_id, server_id, server_version, event_id, anchor_recipient_id, nominal_date, local_date,
    title, status, note, created_at, updated_at, deleted_at, local_rev, acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version,
    (SELECT id_v2 FROM v1_events WHERE local_id = old.event_id),
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.anchor_recipient_id),
    old.nominal_date, old.local_date, old.title, old.status, old.note, old.created_at, old.updated_at,
    old.deleted_at, old.local_rev, old.acked_local_rev
FROM v1_event_occurrences AS old;

INSERT INTO reminder_rules (
    local_id, server_id, server_version, event_id, days_before, reminder_time, enabled, created_at,
    updated_at, deleted_at, local_rev, acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version,
    (SELECT id_v2 FROM v1_events WHERE local_id = old.event_id),
    old.days_before, old.reminder_time, old.enabled, old.created_at, old.updated_at, old.deleted_at,
    old.local_rev, old.acked_local_rev
FROM v1_reminder_rules AS old;

INSERT INTO notification_schedules (
    occurrence_id, days_before, event_id, scheduled_at, local_notification_id, status
)
SELECT
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = old.occurrence_id),
    old.days_before,
    (SELECT id_v2 FROM v1_events WHERE local_id = old.event_id),
    old.scheduled_at, old.local_notification_id, old.status
FROM v1_notification_schedules AS old;

INSERT INTO gifts (
    local_id, server_id, server_version, recipient_id, occurrence_id, suggestion_server_id, name,
    category, source, status, status_changed_at, canonical_key, product_url, image_url,
    estimated_amount_x100, purchased_on, given_on, follow_up_prompted_at, follow_up_dismissed_at,
    note, reaction, created_at, updated_at, deleted_at, local_rev, acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version,
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.recipient_id),
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = old.occurrence_id),
    old.suggestion_server_id, old.name, old.category, old.source, old.status, old.status_changed_at,
    old.canonical_key, old.product_url, old.image_url, old.estimated_amount_x100, old.purchased_on,
    old.given_on, old.follow_up_prompted_at, old.follow_up_dismissed_at, old.note, old.reaction,
    old.created_at, old.updated_at, old.deleted_at, old.local_rev, old.acked_local_rev
FROM v1_gifts AS old;

INSERT INTO budgets (
    local_id, server_id, server_version, scope_type, scope_year, occurrence_id, amount_x100,
    currency, alert_threshold_percent, created_at, updated_at, deleted_at, local_rev,
    acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version, old.scope_type, old.scope_year,
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = old.occurrence_id),
    old.amount_x100, old.currency, old.alert_threshold_percent, old.created_at, old.updated_at,
    old.deleted_at, old.local_rev, old.acked_local_rev
FROM v1_budgets AS old;

INSERT INTO expenses (
    local_id, server_id, server_version, gift_id, occurrence_id, expense_type, amount_x100,
    currency, occurred_at, description, is_counted_in_actual_spend, created_at, updated_at,
    deleted_at, local_rev, acked_local_rev
)
SELECT
    old.id_v2, old.server_id, old.server_version,
    (SELECT id_v2 FROM v1_gifts WHERE local_id = old.gift_id),
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = old.occurrence_id),
    old.expense_type, old.amount_x100, old.currency, old.occurred_at, old.description,
    old.is_counted_in_actual_spend, old.created_at, old.updated_at, old.deleted_at, old.local_rev,
    old.acked_local_rev
FROM v1_expenses AS old;

INSERT INTO occurrence_tasks (
    local_id, occurrence_id, gift_id, title, due_on, completed_at, created_at
)
SELECT
    old.id_v2,
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = old.occurrence_id),
    (SELECT id_v2 FROM v1_gifts WHERE local_id = old.gift_id),
    old.title, old.due_on, old.completed_at, old.created_at
FROM v1_occurrence_tasks AS old;

INSERT INTO draft_preferences (
    id, recipient_id, category, value, polarity, created_at
)
SELECT
    old.id,
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.recipient_id),
    old.category, old.value, old.polarity, old.created_at
FROM v1_draft_preferences AS old;

INSERT INTO ai_draft (
    id, recipient_id, occurrence_id, form_json, updated_at
)
SELECT
    old.id,
    (SELECT id_v2 FROM v1_recipients WHERE local_id = old.recipient_id),
    (SELECT id_v2 FROM v1_event_occurrences WHERE local_id = old.occurrence_id),
    old.form_json, old.updated_at
FROM v1_ai_draft AS old;

INSERT INTO ai_cache SELECT * FROM v1_ai_cache;

INSERT INTO image_cache SELECT * FROM v1_image_cache;

INSERT INTO sync_state SELECT * FROM v1_sync_state;

INSERT INTO migration_check SELECT NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check);
INSERT INTO migration_check SELECT sync_enabled = 0 FROM local_profile WHERE slot = 1;
DROP TABLE temp.v1_local_profile;
DROP TABLE temp.v1_app_settings_local;
DROP TABLE temp.v1_recipients;
DROP TABLE temp.v1_recipient_preferences;
DROP TABLE temp.v1_events;
DROP TABLE temp.v1_event_recipients;
DROP TABLE temp.v1_event_occurrences;
DROP TABLE temp.v1_occurrence_recipients;
DROP TABLE temp.v1_reminder_rules;
DROP TABLE temp.v1_notification_schedules;
DROP TABLE temp.v1_gifts;
DROP TABLE temp.v1_budgets;
DROP TABLE temp.v1_expenses;
DROP TABLE temp.v1_occurrence_tasks;
DROP TABLE temp.v1_draft_preferences;
DROP TABLE temp.v1_ai_draft;
DROP TABLE temp.v1_ai_cache;
DROP TABLE temp.v1_image_cache;
DROP TABLE temp.v1_sync_state;
DROP TABLE temp.migration_check;
COMMIT;
PRAGMA foreign_keys = ON;
