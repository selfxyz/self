// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  IdCardIcon,
  IDDataScreen as EuclidIDDataScreen,
  LeftArrowIcon,
  QuestionCircleStrokeIcon,
} from '@selfxyz/euclid';
import type { DocumentAttributes } from '@selfxyz/mobile-sdk-alpha/browser';
import { getDocumentAttributes } from '@selfxyz/mobile-sdk-alpha/browser';

import { PrivacyMask } from '../../observability/PrivacyMask';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getIdCardProps } from '../../utils/provingUtils';

interface LoadedDocument {
  attrs: DocumentAttributes;
  documentCategory?: string;
  mock?: boolean;
  mrzLines: string[];
}

// MRZ name field: 'SURNAME<<GIVEN<NAMES'.
function splitName(nameSlice: string): { surname: string; givenName: string } {
  const [surnameRaw = '', givenRaw = ''] = (nameSlice ?? '').split('<<');
  return {
    surname: surnameRaw.replace(/</g, ' ').trim(),
    givenName: givenRaw.replace(/</g, ' ').trim(),
  };
}

// MRZ dates are YYMMDD. Births past the current two-digit year are 1900s;
// expiries are always this century (ICAO biometric era).
function formatMrzDate(slice: string, kind: 'birth' | 'expiry'): string {
  if (!/^\d{6}$/.test(slice ?? '')) return '';
  const yy = Number(slice.slice(0, 2));
  const currentYY = new Date().getFullYear() % 100;
  const century = kind === 'birth' && yy > currentYY ? 1900 : 2000;
  return `${century + yy}-${slice.slice(2, 4)}-${slice.slice(4, 6)}`;
}

export const IDDataScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, documents } = useSelfClient();
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const catalog = await documents.loadDocumentCatalog();
        const entries = catalog.documents ?? [];
        const id = catalog.selectedDocumentId ?? entries[0]?.id;
        if (!id) return;
        const entry = entries.find(doc => doc.id === id);
        const stored = await documents.loadDocumentById(id);
        if (!stored || cancelled) return;
        const attrs = getDocumentAttributes(stored);
        const mrz = (stored as { mrz?: unknown }).mrz;
        const mrzLines =
          typeof mrz === 'string'
            ? mrz
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
            : [];
        setLoaded({
          attrs,
          documentCategory: entry?.documentCategory,
          mock: entry?.mock,
          mrzLines,
        });
      } catch {
        // Leave the empty state: the screen renders with blank fields rather
        // than fabricated data.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documents]);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const onManageID = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('id_data_manage_pressed');
    navigate('/docs');
  }, [navigate, haptic, analytics]);

  const cardProps = getIdCardProps(loaded?.documentCategory, loaded?.mock);
  const attrs = loaded?.attrs;
  const name = splitName(attrs?.nameSlice ?? '');
  const details = {
    profileImage: '',
    type: attrs?.isPassportType ? 'PASSPORT' : (cardProps.title ?? ''),
    code: attrs?.issuingStateSlice ?? '',
    documentNumber: attrs?.passNoSlice ?? '',
    surname: name.surname,
    givenName: name.givenName,
    sex: attrs?.sexSlice ?? '',
    nationality: attrs?.nationalitySlice ?? '',
    dateOfBirth: formatMrzDate(attrs?.dobSlice ?? '', 'birth'),
    dateOfExpiry: formatMrzDate(attrs?.expiryDateSlice ?? '', 'expiry'),
  };
  const documentData = [
    { label: 'ID Type', value: cardProps.title ?? '' },
    { label: 'Document number', value: details.documentNumber },
    { label: 'Surname', value: details.surname },
    { label: 'Given name', value: details.givenName },
    { label: 'Nationality', value: details.nationality },
    { label: 'Date of birth', value: details.dateOfBirth },
    { label: 'Date of expiry', value: details.dateOfExpiry },
  ].filter(item => item.value !== '');

  return (
    <PrivacyMask>
      <EuclidIDDataScreen
        insets={WEB_SAFE_AREA.insets}
        idCard={{
          title: cardProps.title ?? 'Document',
          subtitleLine1: cardProps.subtitle ?? '',
          details,
          mrzLine1: loaded?.mrzLines[0] ?? '',
          mrzLine2: loaded?.mrzLines[1] ?? '',
          ...(loaded?.mrzLines[2] ? { mrzLine3: loaded.mrzLines[2] } : {}),
        }}
        identificationDetailsTitle="Identification details"
        identificationDetailsDescription="All data is stored locally on your device. Self does not collect or share any of this information without your consent."
        identificationDetailsLogo={
          <div style={{ width: 32, height: 21, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IdCardIcon size={24} color="#2563EB" />
          </div>
        }
        documentData={documentData}
        onClose={handleBack}
        onInfo={() => analytics.trackEvent('id_data_info_pressed')}
        onManageID={onManageID}
        closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
        infoIcon={({ size, color }) => <QuestionCircleStrokeIcon size={size} color={color} />}
      />
    </PrivacyMask>
  );
};
