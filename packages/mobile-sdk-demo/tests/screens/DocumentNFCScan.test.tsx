import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DocumentNFCScan from '../../src/screens/DocumentNFCScan';

describe('DocumentNFCScan screen', () => {
  it('presents NFC scanning guidance and responds to back presses', async () => {
    const onBack = vi.fn();

    render(<DocumentNFCScan onBack={onBack} />);

    expect(screen.getByText('Document NFC Scan')).toBeInTheDocument();
    expect(screen.getByText(/nfc-based passport reading/i)).toBeInTheDocument();
    expect(screen.getByText(/secure data extraction/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
