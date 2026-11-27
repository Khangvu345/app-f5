import { useEffect } from 'react';

import { reconcileReminders } from '@/services/storage/local-storage';
import { useAuthStore } from '@/store/auth.store';

import { configureNotificationHandler, notificationScheduler } from '../api/notification.scheduler';
import { retryPendingCancellations } from '../api/reminders.api';

/**
 * Gắn một lần ở layout gốc sau khi có hồ sơ: bật handler hiển thị thông báo foreground, đặt lại các lịch
 * nhắc còn dang dở (`reconcileReminders`) và hoàn tất các lần hủy lịch chưa xác nhận.
 */
export function useReminderReconcile(): void {
  const profile = useAuthStore((state) => state.profile);

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (!profile) return;
    void reconcileReminders(notificationScheduler)
      .then(() => retryPendingCancellations(profile))
      .catch(() => {
        // Lần sau khởi động sẽ thử lại; lượt chờ vẫn được giữ trong SQLite.
      });
  }, [profile]);
}
