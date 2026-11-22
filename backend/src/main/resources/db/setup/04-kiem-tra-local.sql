-- Chạy từ thư mục db/setup, dùng SQLite trong bộ nhớ:
--   sqlite3 -bail :memory: ".read 03-local.sql" ".read 04-kiem-tra-local.sql"
PRAGMA foreign_keys = ON;
BEGIN;

CREATE TEMP VIEW mau AS SELECT
    '00000000-0000-4000-8000-000000000001' AS nguoi,
    '00000000-0000-4000-8000-000000000002' AS dip,
    '00000000-0000-4000-8000-000000000003' AS lan,
    '00000000-0000-4000-8000-000000000004' AS moc,
    '00000000-0000-4000-8000-000000000005' AS qua,
    '00000000-0000-4000-8000-000000000006' AS chi,
    '00000000-0000-4000-8000-000000000007' AS ngan_sach;

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
INSERT INTO expenses (local_id, gift_id, occurrence_id, expense_type, amount_x100, occurred_at)
    SELECT chi, qua, lan, 'GIFT', 32000000, '2026-12-12' FROM mau;

INSERT INTO kiem_tra VALUES ('CRUD khi chưa có tài khoản',
    (SELECT server_user_id IS NULL AND sync_enabled = 0 FROM local_profile WHERE slot = 1)
    AND (SELECT local_rev = 2 AND name = 'Ngọc Linh' FROM recipients WHERE local_id = (SELECT nguoi FROM mau)));
INSERT INTO kiem_tra VALUES ('Chi thực tế 320.000 VND trên ngân sách 600.000 VND',
    (SELECT s.actual_spend_x100 = 32000000 AND b.amount_x100 = 60000000
     FROM budgets b JOIN v_occurrence_spend s USING (occurrence_id, currency)
     WHERE b.local_id = (SELECT ngan_sach FROM mau)));

UPDATE local_profile SET server_user_id = '7' WHERE slot = 1;
INSERT INTO kiem_tra VALUES ('Đăng nhập vẫn giữ đồng bộ tắt và hàng chờ trống',
    (SELECT sync_enabled = 0 FROM local_profile WHERE slot = 1) AND NOT EXISTS (SELECT 1 FROM sync_outbox));

-- Người dùng bật đồng bộ. Mô phỏng phản hồi /auth/sync v1 chỉ có ID, chưa có phiên bản.
UPDATE local_profile SET sync_enabled = 1 WHERE slot = 1;
UPDATE recipients SET server_id = '9007199254740993' WHERE local_id = (SELECT nguoi FROM mau);
UPDATE events SET server_id = '29' WHERE local_id = (SELECT dip FROM mau);
UPDATE gifts SET server_id = '31' WHERE local_id = (SELECT qua FROM mau);
INSERT INTO kiem_tra VALUES ('Tra ngược ID server giữ đúng người nhận, dịp và món quà',
    (SELECT r.local_id = m.nguoi AND e.local_id = m.dip AND g.server_id = '31'
         AND r.server_version IS NULL AND r.local_rev = 2
     FROM recipients r JOIN event_recipients x ON x.recipient_id = r.local_id
     JOIN events e ON e.local_id = x.event_id
     JOIN event_occurrences o ON o.event_id = e.local_id
     JOIN gifts g ON g.occurrence_id = o.local_id AND g.recipient_id = r.local_id
     CROSS JOIN mau m
     WHERE r.server_id = '9007199254740993' AND e.server_id = '29'));

UPDATE gifts SET deleted_at = '2026-12-13T00:00:00Z' WHERE local_id = (SELECT qua FROM mau);
INSERT INTO kiem_tra VALUES ('Xóa mềm quà giữ mapping và loại khoản chi khỏi tổng',
    (SELECT deleted_at IS NOT NULL AND server_id = '31' FROM gifts WHERE local_id = (SELECT qua FROM mau))
    AND NOT EXISTS (SELECT 1 FROM v_occurrence_spend WHERE occurrence_id = (SELECT lan FROM mau)));
INSERT INTO kiem_tra VALUES ('Mọi khóa ngoại hợp lệ', NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check));
ROLLBACK;
SELECT 'Đạt kiểm tra CRUD local GiftMate.' AS ket_qua;
