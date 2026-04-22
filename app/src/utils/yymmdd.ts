// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const parseYYMMDD = (yymmdd: string) => {
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  const dd = yymmdd.substring(4, 6);
  return { yy, mm, dd };
};

export const birthDateToDisplay = (yymmdd: string): string => {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const { yy, mm, dd } = parseYYMMDD(yymmdd);
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  return `${MONTHS[mm - 1]} ${dd} ${year}`;
};

export const expiryDateToDisplay = (yymmdd: string): string => {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const { yy, mm, dd } = parseYYMMDD(yymmdd);
  return `${MONTHS[mm - 1]} ${dd} ${2000 + yy}`;
};

export const pickerDateToYYMMDD = (date: Date): string => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};
