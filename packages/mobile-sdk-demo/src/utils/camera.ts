// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { MRZInfo, MRZValidation } from '@selfxyz/mobile-sdk-alpha';
import { extractMRZInfo } from '@selfxyz/mobile-sdk-alpha';

export type MRZPayload = MRZInfo | (MRZInfo & { rawMRZ?: string; raw?: string; mrzString?: string }) | string;

export interface NormalizedMRZResult {
  info: MRZInfo;
  readableBirthDate: string;
  readableExpiryDate: string;
}

export interface ValidationRow {
  label: string;
  value: boolean | undefined | null;
}

export function humanizeDocumentType(documentType: string): string {
  if (documentType === 'P') {
    return 'Passport';
  }

  if (documentType === 'I') {
    return 'ID Card';
  }

  if (!documentType) {
    return 'Unknown';
  }

  return documentType.trim().toUpperCase();
}

export function buildValidationRows(validation?: MRZValidation): ValidationRow[] | null {
  if (!validation) {
    return null;
  }

  return [
    { label: 'Format', value: validation.format },
    { label: 'Document number checksum', value: validation.passportNumberChecksum },
    { label: 'Date of birth checksum', value: validation.dateOfBirthChecksum },
    { label: 'Expiry date checksum', value: validation.dateOfExpiryChecksum },
    { label: 'Composite checksum', value: validation.compositeChecksum },
    { label: 'Overall validation', value: validation.overall },
  ];
}

export function formatMRZDate(mrzDate: string, locale: string = 'default'): string {
  if (!/^\d{6}$/.test(mrzDate)) {
    return 'Unknown';
  }

  const yearPart = parseInt(mrzDate.slice(0, 2), 10);
  const monthPart = parseInt(mrzDate.slice(2, 4), 10);
  const dayPart = parseInt(mrzDate.slice(4, 6), 10);

  if (Number.isNaN(yearPart) || monthPart < 1 || monthPart > 12 || dayPart < 1 || dayPart > 31) {
    return 'Unknown';
  }

  const currentYear = new Date().getFullYear() % 100;
  const century = yearPart > currentYear ? 1900 : 2000;
  const fullYear = century + yearPart;

  const date = new Date(Date.UTC(fullYear, monthPart - 1, dayPart));
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  try {
    if (typeof Intl !== 'undefined') {
      const localeOption = locale === 'default' ? undefined : locale;
      return new Intl.DateTimeFormat(localeOption, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    }
  } catch {
    // Fallback to ISO-like format below.
  }

  const monthString = `${monthPart}`.padStart(2, '0');
  const dayString = `${dayPart}`.padStart(2, '0');
  return `${fullYear}-${monthString}-${dayString}`;
}

export function normalizeMRZPayload(payload: MRZPayload): NormalizedMRZResult {
  let info: MRZInfo;

  if (typeof payload === 'string') {
    info = extractMRZInfo(payload);
  } else {
    const withRaw = payload as MRZInfo & { rawMRZ?: string; raw?: string; mrzString?: string };
    const rawCandidate = withRaw.rawMRZ ?? withRaw.raw ?? withRaw.mrzString;

    if (typeof rawCandidate === 'string' && rawCandidate.trim().length > 0) {
      info = extractMRZInfo(rawCandidate);
    } else {
      info = {
        documentNumber: withRaw.documentNumber,
        dateOfBirth: withRaw.dateOfBirth,
        dateOfExpiry: withRaw.dateOfExpiry,
        issuingCountry: withRaw.issuingCountry,
        documentType: withRaw.documentType,
        validation: withRaw.validation,
      };
    }
  }

  return {
    info,
    readableBirthDate: formatMRZDate(info.dateOfBirth),
    readableExpiryDate: formatMRZDate(info.dateOfExpiry),
  };
}
