// Route goc: chuyen huong theo trang thai dang nhap.
// Khong co file nay, app mo len se vao "/" ma khong co route nao khop -> +not-found.
import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return <Redirect href="/(app)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
