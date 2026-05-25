// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface DevScreenLink {
  href: string;
  label: string;
}

interface DevScreenGroup {
  title: string;
  links: DevScreenLink[];
  description?: string;
}

const screenGroups: DevScreenGroup[] = [
  {
    title: 'Home & Documents',
    links: [
      { href: '/manage-documents', label: 'Manage Documents' },
      { href: '/id-data', label: 'ID Data' },
    ],
  },
  {
    title: 'Onboarding',
    links: [
      { href: '/onboarding/tour/1', label: 'Tour' },
      { href: '/onboarding/country', label: 'Country Picker' },
      { href: '/onboarding/confirm', label: 'Confirm ID' },
      { href: '/onboarding/passport/instructions', label: 'Passport — Instructions' },
      { href: '/onboarding/passport/code-scan-instructions', label: 'Passport — Code Scan Instructions' },
      { href: '/onboarding/passport/code-scan-viewfinder', label: 'Passport — Code Scan Viewfinder' },
      { href: '/onboarding/passport/nfc', label: 'Passport — NFC' },
      { href: '/onboarding/passport/nfc-success', label: 'Passport — NFC Success' },
      { href: '/onboarding/passport/nfc-error', label: 'Passport — NFC Error' },
      { href: '/onboarding/eu-id/instructions', label: 'EU ID — Instructions' },
      { href: '/onboarding/eu-id/back-instructions', label: 'EU ID — Back Instructions' },
      { href: '/onboarding/eu-id/can-instructions', label: 'EU ID — CAN Instructions' },
      { href: '/onboarding/eu-id/code-scan-viewfinder', label: 'EU ID — Code Scan Viewfinder' },
      { href: '/onboarding/eu-id/nfc-instructions', label: 'EU ID — NFC Instructions' },
      { href: '/onboarding/eu-id/nfc-success', label: 'EU ID — NFC Success' },
      { href: '/onboarding/eu-id/nfc-error', label: 'EU ID — NFC Error' },
      { href: '/onboarding/aadhaar/instructions', label: 'Aadhaar — App Instructions' },
      { href: '/onboarding/aadhaar/upload-success', label: 'Aadhaar — Upload Success' },
      { href: '/onboarding/aadhaar/upload-error', label: 'Aadhaar — Upload Error' },
      { href: '/onboarding/success', label: 'Scan Success' },
      { href: '/onboarding/recovery-phrase', label: 'Recovery Phrase' },
      { href: '/onboarding/failure', label: 'Registration Failure' },
      { href: '/onboarding/backup', label: 'Social Sign-On Method' },
      { href: '/onboarding/signin', label: 'Social Sign-On' },
      { href: '/onboarding/conflict', label: 'Conflict Detected' },
      { href: '/onboarding/notifications', label: 'Push Notification Prompt' },
    ],
  },
  {
    title: 'Points',
    links: [
      { href: '/points', label: 'Points' },
      { href: '/points/invite', label: 'Invite Friends' },
    ],
  },
  {
    title: 'Proving',
    links: [
      { href: '/proving/qr-scan', label: 'QR Viewfinder' },
      {
        href: '/proving?disclosures=name,nationality,age_above_18,date_of_birth&appName=Playground&appEndpoint=https%3A%2F%2Fplayground.staging.self.xyz%2Fapi%2Fverify&environment=stg&endpointType=staging_https&userIdType=hex&userId=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        label: 'Disclosure Demo (Mock Request)',
      },
      { href: '/proving/receipt', label: 'Proof Receipt' },
      { href: '/proving/history', label: 'Proof History' },
      { href: '/proving/generation-success', label: 'Generation Success' },
      { href: '/proving/backup-prompt', label: 'Backup Prompt' },
      { href: '/proving/kyc-pending', label: 'KYC Pending' },
      { href: '/proving/kyc-success', label: 'KYC Success' },
    ],
  },
  {
    title: 'Recovery',
    links: [
      { href: '/settings/backup', label: 'Backup Method Picker' },
      { href: '/settings/recovery-phrase', label: 'Recovery Phrase' },
      { href: '/recovery', label: 'Launch Recovery' },
      { href: '/recovery/phrase-input', label: 'Secret Phrase Input' },
      { href: '/recovery/success', label: 'Recovery Success' },
    ],
  },
  {
    title: 'Settings',
    links: [
      { href: '/settings', label: 'Settings' },
      { href: '/settings/dev-mode', label: 'Dev Mode' },
      { href: '/settings/security', label: 'Security' },
      { href: '/settings/notifications', label: 'Notification Preferences' },
    ],
  },
  {
    title: 'Embed — Screens',
    links: [
      { href: '/tunnel/tour/1', label: 'Tour' },
      { href: '/tunnel/kyc-failure', label: 'KYC Failure' },
      { href: '/tunnel/recovery-required', label: 'Recovery Required' },
      { href: '/tunnel/proof/generating', label: 'Proving' },
      { href: '/tunnel/proof/result', label: 'Result' },
      { href: '/tunnel/proof/receipt', label: 'Proof Receipt' },
    ],
  },
  {
    title: 'Embed — Mock KYC',
    description: 'Mocks diverge after /tunnel/kyc; some outcomes intentionally share the same final route.',
    links: [
      { href: '/tunnel/tour/1?mock=success', label: 'Flow → KYC Success, Then Proof Failure' },
      { href: '/tunnel/tour/1?mock=kyc-failure', label: 'Flow → KYC Error (Retryable)' },
      { href: '/tunnel/tour/1?mock=registration-failure', label: 'Flow → KYC Error (Fatal → Tour Step 4)' },
      { href: '/tunnel/tour/1?mock=cancel', label: 'Flow → KYC Cancel → Tour Step 4' },
    ],
  },
  {
    title: 'Debug',
    links: [{ href: '/dev/keychain', label: 'Keychain Debug' }],
  },
];

const allLinks = screenGroups.flatMap(g => g.links);

export const DevRouteMenu: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [isOpen]);

  const currentLabel = useMemo(() => {
    const fullPath = `${location.pathname}${location.search}`;
    return allLinks.find(link => link.href === fullPath)?.label ?? 'Dev Screens';
  }, [location.pathname, location.search]);

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
            gap: 4,
            padding: 14,
            borderRadius: 14,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {screenGroups.map(group => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '8px 2px 2px',
                }}
              >
                {group.title}
              </div>
              {group.description ? (
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontSize: 11,
                    lineHeight: 1.4,
                    padding: '0 2px 6px',
                  }}
                >
                  {group.description}
                </div>
              ) : null}
              {group.links.map(link => {
                const isActive = `${location.pathname}${location.search}` === link.href;

                return (
                  <button
                    key={link.href}
                    ref={isActive ? activeRef : undefined}
                    onClick={() => {
                      navigate(link.href);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: isActive ? '1px solid #7c8aff' : '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: isActive ? 'rgba(124, 138, 255, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 500,
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
          ))}
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
        {isOpen ? 'Close' : currentLabel}
      </button>
    </div>
  );
};
