// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { LogLevel } from 'src/browser';
import { SdkEvents } from 'src/browser';
import { useSelfClient } from 'src/context';
import type { NFCScanContext } from 'src/proving/internal/logging';

export const useTrackNFCEvent = () => {
  const selfClient = useSelfClient();

  return (level: LogLevel, message: string, context: NFCScanContext, extra?: Record<string, unknown>) =>
    selfClient.emit(SdkEvents.NFC_EVENT, {
      level,
      context,
      event: message,
      details: extra,
    });
};
