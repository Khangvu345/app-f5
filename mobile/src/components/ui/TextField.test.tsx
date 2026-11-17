import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from './TextField';

describe('TextField', () => {
  it('renders the label and forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Email" value="" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByDisplayValue(''), 'a@b.com');

    expect(screen.getByText('Email')).toBeTruthy();
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('shows the error message only when provided', async () => {
    const { rerender } = await render(<TextField label="Email" value="" />);
    expect(screen.queryByText('Email không hợp lệ.')).toBeNull();

    await rerender(<TextField label="Email" value="" error="Email không hợp lệ." />);
    expect(screen.getByText('Email không hợp lệ.')).toBeTruthy();
  });
});
