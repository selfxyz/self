// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { captureFixtureTape } from '@/config/sentry';
import type { FixtureTapeSummary } from '@/integrations/nfc/passportReader';
import { fixtureCapture as bridge } from '@/integrations/nfc/passportReader';
import { shareViaNative } from '@/integrations/sharing';

export type { FixtureTapeSummary };

/**
 * Orchestration over the native APDU fixture-capture bridge. The native module
 * stages a redacted "tape" at the end of every scan when capture is enabled;
 * these helpers turn capture on/off, list/preview staged tapes, and ship a tape
 * to us via the OS share sheet or Sentry. Tapes are sent nowhere automatically.
 */

export const isFixtureCaptureSupported = bridge.isSupported;

/** Turn capture on/off. Disabling also revokes (deletes) any staged tapes. */
export const setCaptureEnabled = (enabled: boolean): Promise<boolean> =>
  bridge.setEnabled(enabled);

export const listTapes = (): Promise<FixtureTapeSummary[]> =>
  bridge.listTapes();

/** The redacted JSON of one tape — exactly the bytes that would be sent. */
export const readTape = (name: string): Promise<string | null> =>
  bridge.readTape(name);

/** Revoke: delete every staged tape. */
export const deleteAllTapes = (): Promise<void> => bridge.deleteTapes();

const prettyPrint = (json: string): string => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
};

/**
 * Opens the OS share sheet with the tape's redacted JSON as text. Returns false
 * when the tape can't be read (unknown name / unsupported build).
 */
export const shareTape = async (name: string): Promise<boolean> => {
  const json = await readTape(name);
  if (!json) {
    return false;
  }
  await shareViaNative(prettyPrint(json), '', `APDU fixture: ${name}`);
  return true;
};

/** Uploads the tape's redacted JSON to Sentry as a JSON attachment. */
export const uploadTapeToSentry = async (
  tape: FixtureTapeSummary,
): Promise<boolean> => {
  const json = await readTape(tape.name);
  if (!json) {
    return false;
  }
  captureFixtureTape(json, {
    name: tape.name,
    issuingCountry: tape.issuingCountry,
    status: tape.status,
  });
  return true;
};
