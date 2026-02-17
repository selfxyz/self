// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export interface FirstDifference {
  original: string;
  changed: string;
}

export function calculateFirstDifference(original: string, changed: string): FirstDifference | null {
  if (original === changed) {
    return null;
  }

  const minLength = Math.min(original.length, changed.length);
  
  for (let i = 0; i < minLength; i++) {
    if (original[i] !== changed[i]) {
      return {
        original: original[i],
        changed: changed[i]
      };
    }
  }

  if (original.length !== changed.length) {
    return {
      original: original.length > minLength ? original[minLength] : '',
      changed: changed.length > minLength ? changed[minLength] : ''
    };
  }

  return null;
}