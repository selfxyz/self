// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const mockScreenLinks = [
  { href: '/settings/dev-mode', label: 'Dev Mode' },
  { href: '/proving/receipt', label: 'Proof Receipt' },
  { href: '/proving/history', label: 'Proof History' },
  { href: '/proving/dialogue', label: 'Simple Dialogue' },
  { href: '/proving/dialogue-cta', label: 'Dialogue With CTA' },
  { href: '/proving/generation-dialogue', label: 'Generation Dialogue' },
  { href: '/proving/generation-success', label: 'Generation Success' },
  { href: '/proving/backup-prompt', label: 'Backup Prompt' },
  { href: '/proving/kyc-pending', label: 'KYC Pending' },
  { href: '/proving/kyc-success', label: 'KYC Success' },
  { href: '/debug/keychain', label: 'Keychain Debug' },
];

export const DevRouteMenu: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel = useMemo(
    () => mockScreenLinks.find(link => link.href === location.pathname)?.label ?? 'Mock Screens',
    [location.pathname],
  );

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        zIndex: 1000,
      }}
    >
      {isOpen && (
        <div
          style={{
            width: 240,
            maxHeight: '60vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 14,
            borderRadius: 14,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            WV-13 Mock Screens
          </div>
          {mockScreenLinks.map(link => {
            const isActive = location.pathname === link.href;

            return (
              <button
                key={link.href}
                onClick={() => {
                  navigate(link.href);
                  setIsOpen(false);
                }}
                style={{
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: isActive ? '1px solid #7c8aff' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: isActive ? 'rgba(124, 138, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                type="button"
              >
                {link.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setIsOpen(open => !open)}
        style={{
          minWidth: 168,
          padding: '10px 14px',
          borderRadius: 999,
          border: 'none',
          backgroundColor: '#7c8aff',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 10px 24px rgba(124, 138, 255, 0.35)',
        }}
        type="button"
      >
        {isOpen ? 'Close Mock Screens' : currentLabel}
      </button>
    </div>
  );
};
