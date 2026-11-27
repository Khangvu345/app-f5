import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useAuthStore } from '@/store/auth.store';
import type { LocalProfile } from '@/types/local-storage';

export type LoadState<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

interface QueryResult<T> {
  state: LoadState<T>;
  reload: () => void;
}

/**
 * Chạy truy vấn SQLite của hồ sơ hiện hành mỗi khi màn hình được focus.
 * `load` phải ổn định (bọc bằng useCallback) để tránh tải lại liên tục.
 */
export function useProfileQuery<T>(load: (profile: LocalProfile) => Promise<T>): QueryResult<T> {
  const profile = useAuthStore((s) => s.profile);
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const requestRef = useRef(0);

  const run = useCallback(() => {
    if (!profile) return;
    requestRef.current += 1;
    const request = requestRef.current;
    load(profile)
      .then((data) => {
        if (request === requestRef.current) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (request === requestRef.current) {
          setState({ status: 'error', message: 'Không tải được dữ liệu. Vui lòng thử lại.' });
        }
      });
  }, [profile, load]);

  useFocusEffect(run);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    run();
  }, [run]);

  return { state, reload };
}
