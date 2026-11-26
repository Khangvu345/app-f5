import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const PRIVACY_KEY = 'notification_privacy_v1';

interface NotificationPrefsState {
  /** Chế độ riêng tư: thông báo không hiện tên dịp trên màn hình khóa. */
  isPrivate: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  setPrivate: (isPrivate: boolean) => Promise<void>;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  isPrivate: true,
  isLoaded: false,
  async load() {
    if (get().isLoaded) return;
    try {
      const raw = await SecureStore.getItemAsync(PRIVACY_KEY);
      if (raw === '0' || raw === '1') set({ isPrivate: raw === '1' });
    } catch {
      // Không đọc được thì giữ mặc định riêng tư (an toàn hơn).
    }
    set({ isLoaded: true });
  },
  async setPrivate(isPrivate) {
    set({ isPrivate });
    try {
      await SecureStore.setItemAsync(PRIVACY_KEY, isPrivate ? '1' : '0');
    } catch {
      // Giá trị vẫn có hiệu lực trong phiên hiện tại.
    }
  },
}));
