// Bundled from backend/src/main/resources/db/setup/03-local.sql (version 1).
export const LOCAL_SCHEMA = `-- GiftMate | SQLite trên điện thoại, phiên bản 1. Chạy từ thư mục db/setup:
--   sqlite3 -bail ":memory:" ".read 03-local.sql" ".read 04-kiem-tra-local.sql"
-- Xem README-local.md để tạo file thử và tích hợp Expo. Flyway quản lý PostgreSQL ở ../migration.
-- Chạy một lần trên file mới cho mỗi hồ sơ (khách hoặc tài khoản), ngoài giao dịch của bên gọi.
-- App bật PRAGMA foreign_keys = ON mỗi lần mở kết nối và rollback nếu khởi tạo lỗi.
-- Dữ liệu thử nghiệm trong schema PostgreSQL giftmate_local cũ cần được nhập riêng nếu muốn giữ.
-- App sinh local_id (UUID chữ thường) ngay trên máy. FK giữa các bản ghi luôn dùng ID local.
-- BIGINT của server được lưu dưới dạng chuỗi thập phân. Đăng nhập chỉ liên kết tài khoản.
-- /auth/sync v1 trả localId và serverId cho recipient, event, gift. Chỉ ghi nhận khi đủ mapping
-- của lô gửi. server_version để NULL tới khi API trả phiên bản. Đồng bộ mặc định tắt.
-- Ngày dương lịch dùng YYYY-MM-DD, thời điểm dùng UTC ISO 8601. Số tiền nguyên = số tiền × 100.
-- Khi sửa bản ghi dùng UPDATE. Với khóa nghiệp vụ đã xóa mềm, khôi phục bản ghi để giữ UUID.
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

-- Một file ứng với một hồ sơ. Dùng thử ngay khi chưa có server_user_id.
CREATE TABLE local_profile (
    slot INTEGER PRIMARY KEY CHECK (slot = 1),
    server_user_id TEXT CHECK (server_user_id IS NULL OR (server_user_id NOT GLOB '*[^0-9]*' AND substr(server_user_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_user_id) BETWEEN 1 AND 18 OR (length(server_user_id) = 19 AND server_user_id <= '9223372036854775807')))),
    sync_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sync_enabled IN (0, 1)),
    pull_cursor TEXT,
    CHECK (sync_enabled = 0 OR server_user_id IS NOT NULL),
    CHECK (pull_cursor IS NULL OR server_user_id IS NOT NULL)
) STRICT;
INSERT INTO local_profile (slot) VALUES (1);

CREATE TRIGGER local_profile_keep_owner BEFORE UPDATE OF server_user_id ON local_profile
WHEN OLD.server_user_id IS NOT NULL AND NEW.server_user_id IS NOT OLD.server_user_id
BEGIN
    SELECT RAISE(ABORT, 'Use another profile file for another account');
END;

CREATE TRIGGER local_profile_keep_row BEFORE DELETE ON local_profile
BEGIN
    SELECT RAISE(ABORT, 'Profile metadata is required');
END;

CREATE TRIGGER local_profile_prevent_replace BEFORE INSERT ON local_profile
WHEN EXISTS (SELECT 1 FROM local_profile)
BEGIN
    SELECT RAISE(ABORT, 'Update the existing profile instead of replacing it');
END;

CREATE TABLE app_settings_local (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TRIGGER app_settings_touch AFTER UPDATE OF value ON app_settings_local
WHEN NEW.value IS NOT OLD.value
BEGIN
    UPDATE app_settings_local SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE key = NEW.key;
END;

-- Hồ sơ người nhận. Tên và mối quan hệ bắt buộc.
CREATE TABLE recipients (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 150),
    relationship TEXT NOT NULL CHECK (relationship IN ('FAMILY', 'FRIEND', 'PARTNER', 'COLLEAGUE', 'TEACHER', 'OTHER')),
    relationship_detail TEXT CHECK (length(relationship_detail) <= 100),
    age_group TEXT CHECK (age_group IN ('CHILD', 'TEEN', 'ADULT', 'SENIOR', 'UNKNOWN')),
    birth_day INTEGER CHECK (birth_day BETWEEN 1 AND 31),
    birth_month INTEGER CHECK (birth_month BETWEEN 1 AND 12),
    birth_year INTEGER CHECK (birth_year BETWEEN 1 AND 9999),
    notes TEXT CHECK (length(notes) <= 500),
    is_favourite INTEGER NOT NULL DEFAULT 0 CHECK (is_favourite IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0)),
    CHECK ((birth_day IS NULL) = (birth_month IS NULL)),
    CHECK (birth_day IS NULL OR date(printf('%04d-%02d-%02d', coalesce(birth_year, 2000), birth_month, birth_day), '+0 days')
        IS printf('%04d-%02d-%02d', coalesce(birth_year, 2000), birth_month, birth_day))
) STRICT;

-- Sở thích, điều cần tránh và trạng thái xác nhận.
CREATE TABLE recipient_preferences (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    recipient_id TEXT NOT NULL REFERENCES recipients(local_id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 80),
    value TEXT NOT NULL CHECK (length(trim(value)) BETWEEN 1 AND 200),
    polarity TEXT NOT NULL CHECK (polarity IN ('LIKE', 'DISLIKE', 'AVOID')),
    source TEXT NOT NULL DEFAULT 'USER' CHECK (source IN ('USER', 'AI_INFERRED')),
    confirmed_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0))
) STRICT;

CREATE UNIQUE INDEX ux_preferences_value ON recipient_preferences
    (recipient_id, polarity, lower(trim(category)), lower(trim(value)));
CREATE INDEX ix_recipients_name ON recipients(name COLLATE NOCASE) WHERE deleted_at IS NULL;
CREATE INDEX ix_recipients_relationship ON recipients(relationship) WHERE deleted_at IS NULL;

-- Dịp và quy tắc lặp. FK trì hoãn bảo đảm dịp có ít nhất một thành viên khi COMMIT.
CREATE TABLE events (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    anchor_recipient_id TEXT NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 150),
    event_type TEXT NOT NULL CHECK (event_type IN ('BIRTHDAY', 'ANNIVERSARY', 'WEDDING', 'GRADUATION', 'HOLIDAY', 'CUSTOM')),
    occasion_type TEXT CHECK (occasion_type IN ('BIRTHDAY', 'ANNIVERSARY', 'HOLIDAY', 'OTHER')),
    calendar_type TEXT NOT NULL DEFAULT 'SOLAR' CHECK (calendar_type IN ('SOLAR', 'LUNAR')),
    original_day INTEGER NOT NULL CHECK (original_day BETWEEN 1 AND 31),
    original_month INTEGER NOT NULL CHECK (original_month BETWEEN 1 AND 12),
    original_year INTEGER CHECK (original_year BETWEEN 1 AND 9999),
    is_lunar_leap_month INTEGER NOT NULL DEFAULT 0 CHECK (is_lunar_leap_month IN (0, 1)),
    recurrence_frequency TEXT NOT NULL DEFAULT 'ANNUAL' CHECK (recurrence_frequency IN ('NONE', 'ANNUAL')),
    leap_day_policy TEXT CHECK (leap_day_policy IN ('FEB28', 'MAR01', 'SKIP')),
    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    start_date TEXT CHECK (start_date IS NULL OR (start_date IS date(start_date, '+0 days') AND length(start_date) = 10)),
    end_date TEXT CHECK (end_date IS NULL OR (end_date IS date(end_date, '+0 days') AND length(end_date) = 10)),
    default_budget_x100 INTEGER CHECK (default_budget_x100 BETWEEN 1 AND 999999999999999999),
    notes TEXT CHECK (length(notes) <= 500),
    is_year_known INTEGER GENERATED ALWAYS AS (original_year IS NOT NULL) VIRTUAL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0)),
    CHECK (end_date >= start_date),
    CHECK (calendar_type = 'LUNAR' OR is_lunar_leap_month = 0),
    CHECK (calendar_type <> 'LUNAR' OR original_day <= 30),
    CHECK (calendar_type <> 'SOLAR' OR date(printf('%04d-%02d-%02d', coalesce(original_year, 2000), original_month, original_day), '+0 days')
        IS printf('%04d-%02d-%02d', coalesce(original_year, 2000), original_month, original_day)),
    FOREIGN KEY (local_id, anchor_recipient_id) REFERENCES event_recipients(event_id, recipient_id)
        DEFERRABLE INITIALLY DEFERRED
) STRICT;

-- Lưu cả người nhận được dùng làm anchor. is_primary vẫn là thuộc tính nghiệp vụ độc lập.
CREATE TABLE event_recipients (
    event_id TEXT NOT NULL REFERENCES events(local_id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES recipients(local_id) ON DELETE RESTRICT,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
    PRIMARY KEY (event_id, recipient_id)
) STRICT;
CREATE INDEX ix_event_recipients_reverse ON event_recipients(recipient_id, event_id);

-- Một lần diễn ra theo ngày dương đã quy đổi.
CREATE TABLE event_occurrences (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    event_id TEXT NOT NULL REFERENCES events(local_id) ON DELETE CASCADE,
    anchor_recipient_id TEXT NOT NULL,
    nominal_date TEXT,
    local_date TEXT NOT NULL CHECK (local_date IS NULL OR (local_date IS date(local_date, '+0 days') AND length(local_date) = 10)),
    title TEXT CHECK (length(title) <= 150),
    status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'PREPARING', 'COMPLETED', 'SKIPPED', 'ACTIVE', 'CANCELLED')),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0)),
    UNIQUE (event_id, local_date),
    UNIQUE (event_id, local_id),
    FOREIGN KEY (local_id, anchor_recipient_id) REFERENCES occurrence_recipients(occurrence_id, recipient_id)
        DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE INDEX ix_occurrences_calendar ON event_occurrences(local_date, event_id) WHERE deleted_at IS NULL;
CREATE TABLE occurrence_recipients (
    occurrence_id TEXT NOT NULL REFERENCES event_occurrences(local_id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES recipients(local_id) ON DELETE RESTRICT,
    PRIMARY KEY (occurrence_id, recipient_id)
) STRICT;
CREATE INDEX ix_occurrence_recipients_reverse ON occurrence_recipients(recipient_id, occurrence_id);

-- Mốc nhắc của từng dịp. Một dịp có tối đa một quy tắc cho cùng số ngày nhắc trước.
CREATE TABLE reminder_rules (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    event_id TEXT NOT NULL REFERENCES events(local_id) ON DELETE CASCADE,
    days_before INTEGER NOT NULL CHECK (days_before IN (14, 7, 3, 1, 0)),
    reminder_time TEXT NOT NULL DEFAULT '09:00' CHECK (length(reminder_time) = 5
        AND reminder_time GLOB '[0-2][0-9]:[0-5][0-9]' AND reminder_time <= '23:59'),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0)),
    UNIQUE (event_id, days_before)
) STRICT;

-- Một lịch hệ điều hành cho một lần diễn ra và một mốc trên thiết bị hiện tại.
-- Hai FK ghép buộc quy tắc nhắc và lần diễn ra cùng thuộc một dịp.
CREATE TABLE notification_schedules (
    occurrence_id TEXT NOT NULL,
    days_before INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    local_notification_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SCHEDULED', 'SENT', 'CANCEL_PENDING', 'CANCELLED', 'FAILED')),
    PRIMARY KEY (occurrence_id, days_before),
    FOREIGN KEY (event_id, occurrence_id) REFERENCES event_occurrences(event_id, local_id) ON DELETE RESTRICT,
    FOREIGN KEY (event_id, days_before) REFERENCES reminder_rules(event_id, days_before) ON DELETE RESTRICT,
    CHECK (status NOT IN ('SCHEDULED','CANCEL_PENDING') OR local_notification_id IS NOT NULL)
) STRICT;
CREATE INDEX ix_schedules_rule ON notification_schedules(event_id, days_before);

-- Ý tưởng, quá trình mua/tặng và lịch sử theo người nhận.
CREATE TABLE gifts (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    recipient_id TEXT NOT NULL REFERENCES recipients(local_id) ON DELETE RESTRICT,
    occurrence_id TEXT REFERENCES event_occurrences(local_id) ON DELETE SET NULL,
    suggestion_server_id TEXT CHECK (suggestion_server_id IS NULL OR (suggestion_server_id NOT GLOB '*[^0-9]*' AND substr(suggestion_server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(suggestion_server_id) BETWEEN 1 AND 18 OR (length(suggestion_server_id) = 19 AND suggestion_server_id <= '9223372036854775807')))),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
    category TEXT CHECK (length(category) <= 80),
    source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI')),
    status TEXT NOT NULL DEFAULT 'IDEA' CHECK (status IN ('IDEA', 'CONSIDERING', 'SELECTED', 'PURCHASED', 'GIVEN', 'RETURNED', 'CANCELLED')),
    status_changed_at TEXT,
    canonical_key TEXT CHECK (length(canonical_key) <= 150),
    product_url TEXT,
    image_url TEXT,
    estimated_amount_x100 INTEGER CHECK (estimated_amount_x100 BETWEEN 0 AND 999999999999999999),
    purchased_on TEXT CHECK (purchased_on IS NULL OR (purchased_on IS date(purchased_on, '+0 days') AND length(purchased_on) = 10)),
    given_on TEXT CHECK (given_on IS NULL OR (given_on IS date(given_on, '+0 days') AND length(given_on) = 10)),
    follow_up_prompted_at TEXT,
    follow_up_dismissed_at TEXT,
    note TEXT,
    reaction TEXT CHECK (reaction IN ('LOVED', 'LIKED', 'NEUTRAL', 'UNKNOWN')),
    name_normalized TEXT GENERATED ALWAYS AS (lower(trim(name))) VIRTUAL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0)),
    CHECK (status <> 'PURCHASED' OR purchased_on IS NOT NULL)
) STRICT;

CREATE INDEX ix_gifts_recipient ON gifts(recipient_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_gifts_occurrence ON gifts(occurrence_id) WHERE occurrence_id IS NOT NULL;

-- Hạn mức theo năm hoặc theo một lần diễn ra.
CREATE TABLE budgets (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('ANNUAL', 'EVENT')),
    scope_year INTEGER CHECK (scope_year BETWEEN 1 AND 9999),
    occurrence_id TEXT REFERENCES event_occurrences(local_id) ON DELETE CASCADE,
    amount_x100 INTEGER NOT NULL CHECK (amount_x100 BETWEEN 1 AND 999999999999999999),
    currency TEXT NOT NULL DEFAULT 'VND' CHECK (currency GLOB '[A-Z][A-Z][A-Z]'),
    alert_threshold_percent INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0)),
    CHECK ((scope_type = 'ANNUAL' AND scope_year IS NOT NULL AND occurrence_id IS NULL)
        OR (scope_type = 'EVENT' AND scope_year IS NULL AND occurrence_id IS NOT NULL))
) STRICT;

CREATE UNIQUE INDEX ux_budget_year ON budgets(scope_year) WHERE scope_type = 'ANNUAL';
CREATE UNIQUE INDEX ux_budget_occurrence ON budgets(occurrence_id) WHERE scope_type = 'EVENT';

-- Khoản chi thực tế, có thể gắn với quà hoặc lần diễn ra.
CREATE TABLE expenses (
    local_id TEXT NOT NULL PRIMARY KEY,
    server_id TEXT UNIQUE,
    server_version INTEGER CHECK (server_version >= 1),
    gift_id TEXT REFERENCES gifts(local_id) ON DELETE CASCADE,
    occurrence_id TEXT REFERENCES event_occurrences(local_id) ON DELETE SET NULL,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('GIFT', 'SHIPPING', 'WRAPPING', 'OTHER')),
    amount_x100 INTEGER NOT NULL CHECK (amount_x100 BETWEEN 0 AND 999999999999999999),
    currency TEXT NOT NULL DEFAULT 'VND' CHECK (currency GLOB '[A-Z][A-Z][A-Z]'),
    occurred_at TEXT NOT NULL CHECK (occurred_at IS NULL OR (occurred_at IS date(occurred_at, '+0 days') AND length(occurred_at) = 10)),
    description TEXT CHECK (length(description) <= 200),
    is_counted_in_actual_spend INTEGER NOT NULL DEFAULT 1 CHECK (is_counted_in_actual_spend IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    deleted_at TEXT,
    local_rev INTEGER NOT NULL DEFAULT 1 CHECK (local_rev >= 1),
    acked_local_rev INTEGER NOT NULL DEFAULT 0 CHECK (acked_local_rev BETWEEN 0 AND local_rev),
    CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    CHECK (server_id IS NULL OR (server_id NOT GLOB '*[^0-9]*' AND substr(server_id, 1, 1) BETWEEN '1' AND '9'
          AND (length(server_id) BETWEEN 1 AND 18 OR (length(server_id) = 19 AND server_id <= '9223372036854775807')))),
    CHECK (server_id IS NOT NULL OR (server_version IS NULL AND acked_local_rev = 0))
) STRICT;

CREATE INDEX ix_expense_gift ON expenses(gift_id) WHERE gift_id IS NOT NULL;
CREATE INDEX ix_expense_occurrence ON expenses(occurrence_id, currency) WHERE occurrence_id IS NOT NULL;
CREATE INDEX ix_expense_date ON expenses(occurred_at, currency) WHERE deleted_at IS NULL;

CREATE VIEW v_actual_expenses AS
SELECT e.*
FROM expenses e
LEFT JOIN gifts g ON g.local_id = e.gift_id
WHERE e.deleted_at IS NULL AND e.is_counted_in_actual_spend = 1
  AND (e.gift_id IS NULL OR (g.deleted_at IS NULL AND g.status NOT IN ('RETURNED', 'CANCELLED')));

CREATE VIEW v_annual_spend AS
SELECT CAST(substr(occurred_at, 1, 4) AS INTEGER) AS scope_year, currency, SUM(amount_x100) AS actual_spend_x100
FROM v_actual_expenses GROUP BY scope_year, currency;

CREATE VIEW v_occurrence_spend AS
SELECT occurrence_id, currency, SUM(amount_x100) AS actual_spend_x100
FROM v_actual_expenses WHERE occurrence_id IS NOT NULL GROUP BY occurrence_id, currency;

-- Checklist lưu trên máy theo lần diễn ra, giữ được khi xóa liên kết với quà.
CREATE TABLE occurrence_tasks (
    local_id TEXT NOT NULL PRIMARY KEY CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    occurrence_id TEXT NOT NULL REFERENCES event_occurrences(local_id) ON DELETE CASCADE,
    gift_id TEXT REFERENCES gifts(local_id) ON DELETE SET NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    due_on TEXT CHECK (due_on IS NULL OR (due_on IS date(due_on, '+0 days') AND length(due_on) = 10)),
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX ix_tasks_occurrence ON occurrence_tasks(occurrence_id);

-- Bản nháp và cache chỉ thuộc file hồ sơ hiện tại, dùng được trước khi đăng nhập.
CREATE TABLE draft_preferences (
    id INTEGER PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES recipients(local_id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 80),
    value TEXT NOT NULL CHECK (length(trim(value)) BETWEEN 1 AND 200),
    polarity TEXT NOT NULL CHECK (polarity IN ('LIKE', 'DISLIKE', 'AVOID')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX ix_draft_preferences_recipient ON draft_preferences(recipient_id);

CREATE TABLE ai_draft (
    id INTEGER PRIMARY KEY,
    recipient_id TEXT REFERENCES recipients(local_id) ON DELETE SET NULL,
    occurrence_id TEXT REFERENCES event_occurrences(local_id) ON DELETE SET NULL,
    form_json TEXT NOT NULL CHECK (json_valid(form_json)),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE ai_cache (
    request_key TEXT NOT NULL PRIMARY KEY,
    response_json TEXT NOT NULL CHECK (json_valid(response_json)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    expires_at TEXT NOT NULL
) STRICT;

CREATE TABLE image_cache (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    local_path TEXT,
    cached_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

-- Thời điểm hiển thị theo loại dữ liệu. local_profile.pull_cursor đánh dấu trang đã nhận.
CREATE TABLE sync_state (
    entity_type TEXT NOT NULL PRIMARY KEY,
    last_synced_at TEXT
) STRICT;

-- Phần dự phòng cho đồng bộ có sự đồng ý. Ở giai đoạn CRUD, bảng này trống.
-- Một snapshot bất biến đang chờ cho mỗi bản ghi. Những lần sửa mới tăng local_rev.
-- entity_type + local_id là tham chiếu logic đến loại bảng tương ứng, không có FK đa hình.
-- entity_type dùng tên bảng. Các loại trong /auth/sync v1 tương ứng recipients, events, gifts.
-- Khi cập nhật có kiểm tra phiên bản, lấy phiên bản thật của bản ghi đã ánh xạ trước khi gửi.
CREATE TABLE sync_outbox (
    seq INTEGER PRIMARY KEY,
    mutation_id TEXT NOT NULL UNIQUE CHECK (length(mutation_id) = 36 AND mutation_id GLOB '????????-????-????-????-????????????' AND length(replace(mutation_id, '-', '')) = 32 AND replace(mutation_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('recipients', 'recipient_preferences', 'events', 'event_occurrences', 'reminder_rules', 'gifts', 'budgets', 'expenses')),
    local_id TEXT NOT NULL CHECK (length(local_id) = 36 AND local_id GLOB '????????-????-????-????-????????????' AND length(replace(local_id, '-', '')) = 32 AND replace(local_id, '-', '') NOT GLOB '*[^0-9a-f]*'),
    operation TEXT NOT NULL CHECK (operation IN ('UPSERT', 'DELETE')),
    sent_local_rev INTEGER NOT NULL CHECK (sent_local_rev >= 1),
    base_version INTEGER CHECK (base_version >= 1),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFLICT')),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (entity_type, local_id)
) STRICT;

CREATE TRIGGER outbox_requires_opt_in BEFORE INSERT ON sync_outbox
WHEN (SELECT sync_enabled FROM local_profile WHERE slot = 1) IS NOT 1
BEGIN
    SELECT RAISE(ABORT, 'Sync is disabled for this profile');
END;

CREATE TRIGGER outbox_keep_snapshot BEFORE UPDATE OF
    seq, mutation_id, entity_type, local_id, operation, sent_local_rev, base_version, payload_json ON sync_outbox
BEGIN
    SELECT RAISE(ABORT, 'Retry the same mutation with the same snapshot');
END;

-- Phiên bản local thay đổi khi sửa nội dung. ACK và pull chỉ tác động metadata sau khi áp dụng dữ liệu.

CREATE TRIGGER recipients_content_changed AFTER UPDATE OF
    name, relationship, relationship_detail, age_group, birth_day, birth_month,
    birth_year, notes, is_favourite, deleted_at ON recipients
BEGIN
    UPDATE recipients SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER recipients_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON recipients
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER recipients_bound_insert BEFORE INSERT ON recipients
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER recipients_bound_update BEFORE UPDATE OF server_id ON recipients
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER recipient_preferences_content_changed AFTER UPDATE OF
    recipient_id, category, value, polarity, source, confirmed_at, is_active,
    deleted_at ON recipient_preferences
BEGIN
    UPDATE recipient_preferences SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER recipient_preferences_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON recipient_preferences
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER recipient_preferences_bound_insert BEFORE INSERT ON recipient_preferences
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER recipient_preferences_bound_update BEFORE UPDATE OF server_id ON recipient_preferences
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER events_content_changed AFTER UPDATE OF
    anchor_recipient_id, title, event_type, occasion_type, calendar_type, original_day,
    original_month, original_year, is_lunar_leap_month, recurrence_frequency,
    leap_day_policy, timezone, start_date, end_date, default_budget_x100, notes,
    deleted_at ON events
BEGIN
    UPDATE events SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER events_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON events
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER events_bound_insert BEFORE INSERT ON events
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER events_bound_update BEFORE UPDATE OF server_id ON events
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER event_occurrences_content_changed AFTER UPDATE OF
    event_id, anchor_recipient_id, nominal_date, local_date, title, status, note,
    deleted_at ON event_occurrences
BEGIN
    UPDATE event_occurrences SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER event_occurrences_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON event_occurrences
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER event_occurrences_bound_insert BEFORE INSERT ON event_occurrences
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER event_occurrences_bound_update BEFORE UPDATE OF server_id ON event_occurrences
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER reminder_rules_content_changed AFTER UPDATE OF
    event_id, days_before, reminder_time, enabled, deleted_at ON reminder_rules
BEGIN
    UPDATE reminder_rules SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER reminder_rules_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON reminder_rules
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER reminder_rules_bound_insert BEFORE INSERT ON reminder_rules
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER reminder_rules_bound_update BEFORE UPDATE OF server_id ON reminder_rules
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER gifts_content_changed AFTER UPDATE OF
    recipient_id, occurrence_id, suggestion_server_id, name, category, source, status,
    status_changed_at, canonical_key, product_url, image_url, estimated_amount_x100,
    purchased_on, given_on, follow_up_prompted_at, follow_up_dismissed_at, note,
    reaction, deleted_at ON gifts
BEGIN
    UPDATE gifts SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER gifts_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON gifts
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER gifts_bound_insert BEFORE INSERT ON gifts
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER gifts_bound_update BEFORE UPDATE OF server_id ON gifts
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER budgets_content_changed AFTER UPDATE OF
    scope_type, scope_year, occurrence_id, amount_x100, currency,
    alert_threshold_percent, deleted_at ON budgets
BEGIN
    UPDATE budgets SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER budgets_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON budgets
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER budgets_bound_insert BEFORE INSERT ON budgets
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER budgets_bound_update BEFORE UPDATE OF server_id ON budgets
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER expenses_content_changed AFTER UPDATE OF
    gift_id, occurrence_id, expense_type, amount_x100, currency, occurred_at,
    description, is_counted_in_actual_spend, deleted_at ON expenses
BEGIN
    UPDATE expenses SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.local_id;
END;

CREATE TRIGGER expenses_keep_ids BEFORE UPDATE OF local_id, server_id, server_version, acked_local_rev ON expenses
WHEN NEW.local_id IS NOT OLD.local_id
  OR (OLD.server_id IS NOT NULL AND NEW.server_id IS NOT OLD.server_id)
  OR (OLD.server_version IS NOT NULL AND (NEW.server_version IS NULL OR NEW.server_version < OLD.server_version))
  OR NEW.acked_local_rev < OLD.acked_local_rev
BEGIN
    SELECT RAISE(ABORT, 'Identity is immutable; acknowledged revisions are monotonic');
END;

CREATE TRIGGER expenses_bound_insert BEFORE INSERT ON expenses
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

CREATE TRIGGER expenses_bound_update BEFORE UPDATE OF server_id ON expenses
WHEN NEW.server_id IS NOT NULL AND (SELECT server_user_id FROM local_profile WHERE slot = 1) IS NULL
BEGIN
    SELECT RAISE(ABORT, 'A remote mapping requires a bound account');
END;

-- Đã gửi hoặc đang chờ gửi: giữ ID và tombstone cho đến khi có quy trình dọn được xác nhận.

CREATE TRIGGER recipients_retain_identity BEFORE DELETE ON recipients
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'recipients' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

CREATE TRIGGER recipient_preferences_retain_identity BEFORE DELETE ON recipient_preferences
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'recipient_preferences' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

CREATE TRIGGER events_retain_identity BEFORE DELETE ON events
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'events' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

CREATE TRIGGER event_occurrences_retain_identity BEFORE DELETE ON event_occurrences
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'event_occurrences' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

CREATE TRIGGER reminder_rules_retain_identity BEFORE DELETE ON reminder_rules
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'reminder_rules' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

CREATE TRIGGER gifts_retain_identity BEFORE DELETE ON gifts
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'gifts' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

CREATE TRIGGER budgets_retain_identity BEFORE DELETE ON budgets
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'budgets' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

CREATE TRIGGER expenses_retain_identity BEFORE DELETE ON expenses
WHEN OLD.server_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM sync_outbox WHERE entity_type = 'expenses' AND local_id = OLD.local_id
)
BEGIN
    SELECT RAISE(ABORT, 'Archive with deleted_at to retain the shared identity');
END;

-- Mỗi dịp / lần diễn ra đang hoạt động phải giữ một người nhận chưa lưu trữ.
-- Nếu bỏ người đang giữ vai trò anchor, chuyển anchor sang thành viên khác trong cùng giao dịch.
CREATE TRIGGER recipients_keep_active_anchor BEFORE UPDATE OF deleted_at ON recipients
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND (
    EXISTS (SELECT 1 FROM events WHERE anchor_recipient_id = OLD.local_id AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM event_occurrences WHERE anchor_recipient_id = OLD.local_id AND deleted_at IS NULL)
)
BEGIN
    SELECT RAISE(ABORT, 'Replace the anchor recipient or archive the related events and occurrences first');
END;

CREATE TRIGGER events_live_anchor_insert BEFORE INSERT ON events
WHEN NEW.deleted_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM recipients WHERE local_id = NEW.anchor_recipient_id AND deleted_at IS NULL
)
BEGIN
    SELECT RAISE(ABORT, 'An active event or occurrence needs an active recipient');
END;

CREATE TRIGGER events_live_anchor_update BEFORE UPDATE OF anchor_recipient_id, deleted_at ON events
WHEN NEW.deleted_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM recipients WHERE local_id = NEW.anchor_recipient_id AND deleted_at IS NULL
)
BEGIN
    SELECT RAISE(ABORT, 'An active event or occurrence needs an active recipient');
END;

CREATE TRIGGER event_occurrences_live_anchor_insert BEFORE INSERT ON event_occurrences
WHEN NEW.deleted_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM recipients WHERE local_id = NEW.anchor_recipient_id AND deleted_at IS NULL
)
BEGIN
    SELECT RAISE(ABORT, 'An active event or occurrence needs an active recipient');
END;

CREATE TRIGGER event_occurrences_live_anchor_update BEFORE UPDATE OF anchor_recipient_id, deleted_at ON event_occurrences
WHEN NEW.deleted_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM recipients WHERE local_id = NEW.anchor_recipient_id AND deleted_at IS NULL
)
BEGIN
    SELECT RAISE(ABORT, 'An active event or occurrence needs an active recipient');
END;

-- Thành viên được đồng bộ trong snapshot của dịp / lần diễn ra. Sửa bảng nối cũng làm tăng phiên bản cha.

CREATE TRIGGER event_recipients_keep_key BEFORE UPDATE OF event_id, recipient_id ON event_recipients
WHEN NEW.event_id IS NOT OLD.event_id OR NEW.recipient_id IS NOT OLD.recipient_id
BEGIN
    SELECT RAISE(ABORT, 'Replace a membership with DELETE and INSERT in one transaction');
END;

CREATE TRIGGER event_recipients_on_insert AFTER INSERT ON event_recipients
BEGIN
    UPDATE events SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.event_id;
END;

CREATE TRIGGER event_recipients_on_delete AFTER DELETE ON event_recipients
BEGIN
    UPDATE events SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = OLD.event_id;
END;

CREATE TRIGGER event_recipients_on_update AFTER UPDATE OF is_primary ON event_recipients
WHEN NEW.is_primary IS NOT OLD.is_primary
BEGIN
    UPDATE events SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.event_id;
END;

CREATE TRIGGER occurrence_recipients_keep_key BEFORE UPDATE OF occurrence_id, recipient_id ON occurrence_recipients
WHEN NEW.occurrence_id IS NOT OLD.occurrence_id OR NEW.recipient_id IS NOT OLD.recipient_id
BEGIN
    SELECT RAISE(ABORT, 'Replace a membership with DELETE and INSERT in one transaction');
END;

CREATE TRIGGER occurrence_recipients_on_insert AFTER INSERT ON occurrence_recipients
BEGIN
    UPDATE event_occurrences SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = NEW.occurrence_id;
END;

CREATE TRIGGER occurrence_recipients_on_delete AFTER DELETE ON occurrence_recipients
BEGIN
    UPDATE event_occurrences SET local_rev = local_rev + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE local_id = OLD.occurrence_id;
END;

PRAGMA user_version = 1;
COMMIT;
`;
