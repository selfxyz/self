import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProofHistory from '../../src/screens/ProofHistory';

describe('ProofHistory screen', () => {
  it('renders the mock activity feed and supports back navigation', async () => {
    const onBack = vi.fn();

    render(<ProofHistory onBack={onBack} />);

    expect(screen.getByText('Proof History')).toBeInTheDocument();
    expect(screen.getByText(/demo proof history/i)).toBeInTheDocument();
    expect(screen.getByText('DemoBank')).toBeInTheDocument();
    expect(screen.getByText('VerifyMe')).toBeInTheDocument();
    expect(screen.getByText('TravelCheck')).toBeInTheDocument();
    expect(screen.getByText(/passport verification/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
