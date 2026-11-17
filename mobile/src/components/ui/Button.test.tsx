import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

describe('Button', () => {
  it('shows the title and calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button title="Đăng nhập" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText('Đăng nhập')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while loading and hides the title', async () => {
    const onPress = jest.fn();
    await render(<Button title="Đăng nhập" onPress={onPress} loading />);

    await fireEvent.press(screen.getByRole('button'));

    expect(screen.queryByText('Đăng nhập')).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Lưu" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
