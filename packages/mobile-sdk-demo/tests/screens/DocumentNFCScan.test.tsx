import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DocumentNFCScan from '../../src/screens/DocumentNFCScan';
import { useScanNFC } from '@selfxyz/mobile-sdk-alpha/onboarding/scan-nfc';

describe('DocumentNFCScan screen', () => {
  it('presents NFC scanning guidance', () => {
    const onBack = vi.fn();
    const onNavigate = vi.fn();

    render(<DocumentNFCScan onBack={onBack} onNavigate={onNavigate} />);

    expect(screen.getByText('NFC Scan')).toBeInTheDocument();
    expect(screen.getByText('Scan NFC Chip')).toBeInTheDocument();
    expect(screen.getByText(/Place your phone against the NFC chip in your document/i)).toBeInTheDocument();
    expect(screen.getByText(/The chip contains encrypted data that verifies the authenticity/i)).toBeInTheDocument();
    expect(screen.getByText('Document Information')).toBeInTheDocument();
    expect(screen.getByText(/Document Number:/i)).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('auto-starts scanning after 500ms', () => {
    vi.useFakeTimers();
    const onBack = vi.fn();
    const onNavigate = vi.fn();

    render(<DocumentNFCScan onBack={onBack} onNavigate={onNavigate} />);

    const results = (useScanNFC as any).mock.results;
    const lastCall = results[results.length - 1];
    const startScan = lastCall?.value?.startScan;
    expect(startScan).toBeDefined();
    expect(startScan).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(startScan).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('header Back triggers cancel flow and calls onBack', () => {
    const onBack = vi.fn();
    const onNavigate = vi.fn();

    render(<DocumentNFCScan onBack={onBack} onNavigate={onNavigate} />);

    const backButton = screen.getByRole('button', { name: /Back/ });
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows Try Again on error and retries scan when clicked', () => {
    (useScanNFC as any).mockImplementationOnce((_props: any) => {
      const startScan = vi.fn();
      const cancelScan = vi.fn();
      return {
        status: 'idle',
        detailsMessage: null,
        isScanning: false,
        error: 'Some error',
        startScan,
        cancelScan,
      };
    });

    const onBack = vi.fn();
    const onNavigate = vi.fn();

    render(<DocumentNFCScan onBack={onBack} onNavigate={onNavigate} />);

    const tryAgain = screen.getByText('Try Again');
    fireEvent.click(tryAgain);

    const results = (useScanNFC as any).mock.results;
    const lastCall = results[results.length - 1];
    const startScan = lastCall?.value?.startScan;
    expect(startScan).toHaveBeenCalledTimes(1);
  });

  it('renders spinner and status/detail messages while scanning', () => {
    (useScanNFC as any).mockImplementationOnce((_props: any) => ({
      status: 'scanning',
      detailsMessage: 'Hold steady',
      isScanning: true,
      error: null,
      startScan: vi.fn(),
      cancelScan: vi.fn(),
    }));

    const onBack = vi.fn();
    const onNavigate = vi.fn();

    render(<DocumentNFCScan onBack={onBack} onNavigate={onNavigate} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Hold your device near the NFC chip/i)).toBeInTheDocument();
    expect(screen.getByText('Hold steady')).toBeInTheDocument();
  });

  it('navigates to success when scan succeeds', () => {
    vi.useFakeTimers();

    (useScanNFC as any).mockImplementationOnce((props: any) => {
      const startScan = vi.fn(() => {
        props.onSuccess?.();
      });
      const cancelScan = vi.fn();
      return {
        status: 'idle',
        detailsMessage: null,
        isScanning: false,
        error: null,
        startScan,
        cancelScan,
      };
    });

    const onBack = vi.fn();
    const onNavigate = vi.fn();

    render(<DocumentNFCScan onBack={onBack} onNavigate={onNavigate} />);

    vi.advanceTimersByTime(500);
    expect(onNavigate).toHaveBeenCalledWith('success');

    vi.useRealTimers();
  });
});
