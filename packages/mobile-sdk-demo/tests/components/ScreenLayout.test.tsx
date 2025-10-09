import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ScreenLayout from '../../src/components/ScreenLayout';

describe('ScreenLayout', () => {
  it('renders title, children, and right action content', () => {
    render(
      <ScreenLayout title="My Title" onBack={() => {}} rightAction={<span>Clear</span>}>
        <span>Body content</span>
      </ScreenLayout>,
    );

    expect(screen.getByText(/my title/i)).toBeInTheDocument();
    expect(screen.getByText(/body content/i)).toBeInTheDocument();
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
  });

  it('invokes onBack when the header back button is pressed', async () => {
    const onBack = vi.fn();
    render(
      <ScreenLayout title="Back Test" onBack={onBack}>
        <span>Content</span>
      </ScreenLayout>,
    );

    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
