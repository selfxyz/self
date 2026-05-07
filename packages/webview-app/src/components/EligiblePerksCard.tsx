// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { borderRadius, colors, fontFamily, spacing } from '@selfxyz/euclid-core';

export interface EligiblePerksItem {
  id: string;
  label: string;
  isNew?: boolean;
  renderLogo?: () => React.ReactNode;
}

export interface EligiblePerksCardProps {
  perks: EligiblePerksItem[];
  title?: string;
  aboutLabel?: string;
  aboutCopy?: string;
  onPerkPress?: (perkId: string) => void;
  onView?: (perkIds: string[]) => void;
}

export const EligiblePerksCard: React.FC<EligiblePerksCardProps> = ({
  perks,
  title = 'Eligible perks',
  aboutLabel = 'About perks',
  aboutCopy = 'Self Perks is a beta feature. Use this ID to unlock unique perks with participating partners.',
  onPerkPress,
  onView,
}) => {
  const viewedRef = useRef(false);
  const perkIdsKey = useMemo(() => JSON.stringify(perks.map(perk => perk.id)), [perks]);

  useEffect(() => {
    if (!viewedRef.current && perks.length > 0) {
      viewedRef.current = true;
      onView?.(perks.map(perk => perk.id));
    }
  }, [onView, perkIdsKey, perks]);

  if (perks.length === 0) {
    return null;
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.rows}>
        {perks.map(perk => {
          const logo = perk.renderLogo?.();
          const rowContent = (
            <>
              <span
                style={{
                  ...styles.logoContainer,
                  ...(logo ? styles.logoContainerBordered : styles.logoContainerFallback),
                }}
              >
                {logo}
              </span>
              <span style={styles.label}>{perk.label}</span>
              {perk.isNew ? <span style={styles.newPill}>NEW</span> : null}
            </>
          );

          if (!onPerkPress) {
            return (
              <div key={perk.id} style={styles.row}>
                {rowContent}
              </div>
            );
          }

          return (
            <button key={perk.id} style={styles.rowButton} type="button" onClick={() => onPerkPress(perk.id)}>
              {rowContent}
            </button>
          );
        })}
      </div>
      <div style={styles.divider} />
      <div style={styles.aboutSection}>
        <span style={styles.aboutLabel}>{aboutLabel.toUpperCase()}</span>
        <p style={styles.aboutCopy}>{aboutCopy}</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.slate200}`,
    borderRadius: borderRadius.sm,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  title: {
    margin: 0,
    color: colors.black,
    fontFamily: fontFamily.advercase.web,
    fontSize: 22,
    lineHeight: '26px',
    fontWeight: 400,
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.smLg,
  },
  rowButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.smLg,
    border: 'none',
    background: 'transparent',
    padding: 0,
    textAlign: 'left',
    cursor: 'pointer',
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoContainerBordered: { border: `1px solid ${colors.slate200}` },
  logoContainerFallback: { backgroundColor: colors.slate200 },
  label: {
    color: colors.black,
    fontFamily: fontFamily.dinOT.web,
    fontSize: 16,
    lineHeight: '20px',
    fontWeight: 500,
  },
  newPill: {
    marginLeft: 'auto',
    backgroundColor: colors.black,
    color: colors.white,
    borderRadius: 30,
    padding: '4px 8px',
    fontFamily: fontFamily.ibmPlexMono.web,
    fontSize: 10,
    lineHeight: '12.9px',
    letterSpacing: '0.6px',
    fontWeight: 500,
  },
  divider: { borderTop: `1px solid ${colors.slate200}` },
  aboutSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  aboutLabel: {
    color: colors.slate400,
    fontFamily: fontFamily.ibmPlexMono.web,
    fontSize: 10,
    lineHeight: '13px',
    letterSpacing: '1px',
    fontWeight: 500,
  },
  aboutCopy: {
    margin: 0,
    color: colors.slate600,
    fontFamily: fontFamily.dinOT.web,
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 500,
  },
};
