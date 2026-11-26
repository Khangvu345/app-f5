-- Chạy từ thư mục db/setup, dùng SQLite trong bộ nhớ:
--   sqlite3 -bail :memory: ".read 03-local.sql" ".read 04-kiem-tra-local.sql"
PRAGMA foreign_keys = ON;
BEGIN;

CREATE TEMP VIEW mau AS SELECT
    9007199254740993 AS nguoi,
    9007199254740994 AS dip,
    9007199254740995 AS lan,
    9007199254740996 AS moc,
    9007199254740997 AS qua,
    9007199254740998 AS chi,
    9007199254740999 AS ngan_sach;

-- Bất kỳ kết quả sai hoặc NULL nào cũng làm lệnh kiểm tra thất bại.
CREATE TEMP TABLE kiem_tra (
    noi_dung TEXT NOT NULL,
    dat INTEGER NOT NULL CHECK (dat = 1)
) STRICT;

INSERT INTO recipients (local_id, name, relationship)
    SELECT nguoi, 'Linh', 'FRIEND' FROM mau;
INSERT INTO events (local_id, anchor_recipient_id, title, event_type, original_day, original_month)
    SELECT dip, nguoi, 'Sinh nhật Linh', 'BIRTHDAY', 20, 12 FROM mau;
INSERT INTO event_recipients (event_id, recipient_id)
    SELECT dip, nguoi FROM mau;
INSERT INTO event_occurrences (local_id, event_id, anchor_recipient_id, local_date)
    SELECT lan, dip, nguoi, '2026-12-20' FROM mau;
INSERT INTO occurrence_recipients (occurrence_id, recipient_id)
    SELECT lan, nguoi FROM mau;
INSERT INTO reminder_rules (local_id, event_id, days_before)
    SELECT moc, dip, 7 FROM mau;
INSERT INTO notification_schedules (event_id, occurrence_id, days_before, scheduled_at)
    SELECT dip, lan, 7, '2026-12-13T02:00:00Z' FROM mau;

INSERT INTO budgets (local_id, scope_type, occurrence_id, amount_x100)
    SELECT ngan_sach, 'EVENT', lan, 60000000 FROM mau;
INSERT INTO gifts (local_id, recipient_id, occurrence_id, name, estimated_amount_x100)
    SELECT qua, nguoi, lan, 'Bình giữ nhiệt', 35000000 FROM mau;
UPDATE recipients SET name = 'Ngọc Linh' WHERE local_id = (SELECT nguoi FROM mau);
UPDATE gifts SET status = 'SELECTED' WHERE local_id = (SELECT qua FROM mau);
UPDATE gifts SET status = 'PURCHASED', purchased_on = '2026-12-12'
    WHERE local_id = (SELECT qua FROM mau);
INSERT INTO kiem_tra VALUES ('Đổi trạng thái quà ghi lại thời điểm',
    (SELECT status_changed_at IS NOT NULL FROM gifts WHERE local_id = (SELECT qua FROM mau)));
INSERT INTO expenses (local_id, gift_id, occurrence_id, expense_type, amount_x100, occurred_at)
    SELECT chi, qua, lan, 'GIFT', 32000000, '2026-12-12' FROM mau;

INSERT INTO kiem_tra VALUES ('CRUD khi chưa có tài khoản',
    (SELECT server_user_id IS NULL AND sync_enabled = 0 FROM local_profile WHERE slot = 1)
    AND (SELECT local_rev = 2 AND name = 'Ngọc Linh' FROM recipients WHERE local_id = (SELECT nguoi FROM mau)));
INSERT INTO kiem_tra VALUES ('Chi thực tế 320.000 VND trên ngân sách 600.000 VND',
    (SELECT s.actual_spend_x100 = 32000000 AND b.amount_x100 = 60000000
     FROM budgets b JOIN v_occurrence_spend s USING (occurrence_id, currency)
     WHERE b.local_id = (SELECT ngan_sach FROM mau)));

-- Gắn tài khoản chỉ để mở quyền Free trên hồ sơ này.
UPDATE local_profile SET server_user_id = '9007199254740993' WHERE slot = 1;
INSERT INTO kiem_tra VALUES ('Đăng nhập giữ ID tài khoản chính xác, đồng bộ tắt và hàng chờ trống',
    (SELECT server_user_id = '9007199254740993' AND sync_enabled = 0 FROM local_profile WHERE slot = 1)
    AND NOT EXISTS (SELECT 1 FROM sync_outbox));
INSERT INTO kiem_tra VALUES ('ID 64 bit liên kết đúng qua người nhận, dịp, quà và khoản chi',
    EXISTS (SELECT 1 FROM recipients r JOIN event_recipients er ON er.recipient_id = r.local_id
        JOIN event_occurrences o ON o.event_id = er.event_id
        JOIN gifts g ON g.recipient_id = r.local_id AND g.occurrence_id = o.local_id
        JOIN expenses e ON e.gift_id = g.local_id AND e.occurrence_id = o.local_id
        WHERE typeof(r.local_id) = 'integer' AND CAST(r.local_id AS TEXT) = '9007199254740993'));

UPDATE gifts SET deleted_at = '2026-12-13T00:00:00Z' WHERE local_id = (SELECT qua FROM mau);
INSERT INTO kiem_tra VALUES ('Xóa mềm quà loại khoản chi khỏi tổng',
    NOT EXISTS (SELECT 1 FROM v_occurrence_spend WHERE occurrence_id = (SELECT lan FROM mau)));
INSERT INTO kiem_tra VALUES ('Mọi khóa ngoại hợp lệ', NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check));
ROLLBACK;
SELECT 'Đạt kiểm tra CRUD local GiftMate.' AS ket_qua;
