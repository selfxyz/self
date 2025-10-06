import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MenuButton from '../../src/components/MenuButton';

describe('MenuButton', () => {
  it('renders the provided title and subtitle', () => {
    render(<MenuButton title="Documents" subtitle="Manage your IDs" onPress={() => {}} />);

    expect(screen.getByRole('button', { name: /documents/i })).toBeInTheDocument();
    expect(screen.getByText(/manage your ids/i)).toBeInTheDocument();
  });

  it('invokes onPress when pressed if enabled', async () => {
    const onPress = vi.fn();
    render(<MenuButton title="Open" onPress={onPress} isWorking />);

    await userEvent.click(screen.getByRole('button', { name: /open/i }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('prevents presses and shows disabled styles when disabled', async () => {
    const onPress = vi.fn();
    render(<MenuButton title="Disabled" subtitle="Unavailable" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
