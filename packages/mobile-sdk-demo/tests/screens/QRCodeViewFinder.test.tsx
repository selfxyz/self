import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import QRCodeViewFinder from '../../src/screens/QRCodeViewFinder';

describe('QRCodeViewFinder screen', () => {
  it('highlights QR scanning capabilities and handles back navigation', async () => {
    const onBack = vi.fn();

    render(<QRCodeViewFinder onBack={onBack} />);

    expect(screen.getByText('QR Code View Finder')).toBeInTheDocument();
    expect(screen.getByText(/proof verification requests/i)).toBeInTheDocument();
    expect(screen.getByText(/real-time qr detection feedback/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
