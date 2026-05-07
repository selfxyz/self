// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  DetailedTableView,
  DetailedTableViewCell,
  ExposedIDCard,
  IdCardIcon,
  IdentificationDetailsCard,
  LeftArrowIcon,
  QuestionCircleStrokeIcon,
  TopNavigationDialogue,
} from '@selfxyz/euclid';
import { borderRadius, colors, spacing } from '@selfxyz/euclid-core';
import type { PerkId } from '@selfxyz/mobile-sdk-alpha/browser';
import { getPerkRecordsForIdType } from '@selfxyz/mobile-sdk-alpha/browser';

import { EligiblePerksCard } from '../../components/EligiblePerksCard';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

// TODO(WV-14): replace MOCK_ID_TYPE with the real document type once Manage Documents store wiring lands.
const MOCK_ID_TYPE = 'p';

const WEB_PERK_LOGOS: Partial<Record<PerkId, () => React.ReactNode>> = {
  google_usdt_faucet: () => <img src="/logos/google-g.svg" alt="" width={24} height={24} />,
  // TODO(SELF-2857-followup): add aave + ps_human logos.
};

const MOCK_ID_CARD_DETAILS = {
  profileImage: '',
  type: 'ID CARD',
  code: 'SELF',
  documentNumber: '••••••1234',
  surname: 'DOE',
  givenName: 'JOHN',
  sex: 'M',
  nationality: 'UNITED STATES',
  dateOfBirth: '1990-01-15',
  placeOfBirth: 'NEW YORK',
  dateOfIssue: '2020-01-15',
  dateOfExpiry: '2030-01-15',
};

const MOCK_DOCUMENT_DATA = [
  { label: 'ID Type', value: 'Passport' },
  { label: 'Document number', value: '18-299217823' },
  { label: 'Surname', value: 'Doe' },
  { label: 'Given name', value: 'John' },
  { label: 'Nationality', value: 'United States' },
  { label: 'Date of birth', value: '1990-01-15' },
];

export const IDDataScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const perks = useMemo(
    () =>
      getPerkRecordsForIdType(MOCK_ID_TYPE).map(perk => ({
        ...perk,
        renderLogo: WEB_PERK_LOGOS[perk.id],
      })),
    [],
  );

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const onManageID = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('id_data_manage_pressed');
    navigate('/manage-documents');
  }, [navigate, haptic, analytics]);

  return (
    <div style={styles.container}>
      <TopNavigationDialogue
        variant="Primary"
        label="ID Details"
        escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
        infoIcon={({ size, color }) => <QuestionCircleStrokeIcon size={size} color={color} />}
        onPressInfo={() => analytics.trackEvent('id_data_info_pressed')}
        onEscape={onClose}
      />

      <div style={styles.mainArea}>
        <div style={styles.scrollArea}>
          <div style={styles.content}>
            <div style={styles.idCardContainer}>
              <ExposedIDCard
                title="Passport"
                subtitleLine1="UNITED STATES PASSPORT"
                details={MOCK_ID_CARD_DETAILS}
                mrzLine1="P<USA0000000000USA9001150M3001150<<<<<<<<<<<<<<"
                mrzLine2="DOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<0"
              />
            </div>

            <EligiblePerksCard
              perks={perks}
              onView={perkIds =>
                analytics.trackEvent('id_data_perks_viewed', {
                  id_type: MOCK_ID_TYPE,
                  perk_count: perks.length,
                  perk_ids: perkIds,
                })
              }
              onPerkPress={perkId =>
                analytics.trackEvent('id_data_perk_tapped', {
                  id_type: MOCK_ID_TYPE,
                  perk_id: perkId,
                })
              }
            />

            <div style={styles.section}>
              <IdentificationDetailsCard
                title="Identification details"
                description="All data is stored locally on your device. Self does not collect or share any of this information without your consent."
                logo={
                  <div
                    style={{ width: 32, height: 21, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IdCardIcon size={24} color="#2563EB" />
                  </div>
                }
              />

              <DetailedTableView title="Document data" disableScroll>
                {MOCK_DOCUMENT_DATA.map((item, index) => (
                  <DetailedTableViewCell
                    key={`${item.label}-${index}`}
                    variant="document-detail"
                    label={item.label}
                    description={item.value}
                  />
                ))}
              </DetailedTableView>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <Button variant="primary-no-icon" text="Manage ID" onPress={onManageID} fullWidth />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '100vh',
    backgroundColor: colors.slate50,
    paddingTop: WEB_SAFE_AREA.insets.top,
    paddingBottom: WEB_SAFE_AREA.insets.bottom,
  },
  mainArea: { display: 'flex', flexDirection: 'column', flex: 1 },
  scrollArea: { overflowY: 'auto', flex: 1 },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xlXl,
    padding: spacing.mdLg,
  },
  idCardContainer: {
    width: '100%',
    borderRadius: borderRadius.lg,
    boxShadow: '0px 44px 68px 0px rgba(1, 1, 1, 0.25)',
  },
  section: { display: 'flex', flexDirection: 'column', gap: spacing.lg },
  footer: {
    paddingLeft: spacing.mdLg,
    paddingRight: spacing.mdLg,
    paddingTop: spacing.md,
    paddingBottom: WEB_SAFE_AREA.insets.bottom || spacing.lgXl,
  },
};
