import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DocumentCamera from '../../src/screens/DocumentCamera';

describe('DocumentCamera screen', () => {
  it('shows placeholder messaging and handles back navigation', async () => {
    const onBack = vi.fn();
    const onSuccess = vi.fn();

    render(<DocumentCamera onBack={onBack} onSuccess={onSuccess} />);

    expect(screen.getByText('Document Camera')).toBeInTheDocument();
    expect(screen.getByText(/camera-based document scanning/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
