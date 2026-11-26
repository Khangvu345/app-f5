import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RootLayout from '@/app/_layout';
import { setUnauthorizedHandler } from '@/services/api/client';
import { useAuthStore } from '@/store/auth.store';

jest.mock('expo-router', () => ({ ['Stack']: () => null }));
jest.mock('expo-status-bar', () => ({ ['StatusBar']: () => null }));
jest.mock('@/services/api/client', () => ({ setUnauthorizedHandler: jest.fn() }));
jest.mock('@/store/auth.store', () => ({
  useAuthStore: Object.assign(
    jest.fn(() => 'loading'),
    {
      getState: jest.fn(),
    },
  ),
}));

test('startup failure offers a retry and removes the 401 handler on unmount', async () => {
  const hydrate = jest.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined);
  jest
    .mocked(useAuthStore.getState)
    .mockReturnValue({ hydrate } as unknown as ReturnType<typeof useAuthStore.getState>);
  const view = await render(<RootLayout />);
  await screen.findByText('Không thể mở dữ liệu trên thiết bị. Vui lòng thử lại.');
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(2));
  await view.unmount();
  expect(setUnauthorizedHandler).toHaveBeenLastCalledWith(null);
});
