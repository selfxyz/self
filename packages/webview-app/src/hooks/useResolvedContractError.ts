// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useState } from 'react';

import { humanizeError, humanizeErrorAsync, isErrorSelector } from '../utils/contractErrors';

/**
 * Resolves a contract error string to a human-readable message.
 *
 * Known selectors are decoded instantly from the static map.
 * Unknown hex selectors trigger an async lookup via openchain.xyz,
 * returning the formatted error name when it resolves.
 */
export function useResolvedContractError(error: string | undefined): string | undefined {
  const immediate = error ? humanizeError(error) : undefined;
  const [resolved, setResolved] = useState(immediate);

  useEffect(() => {
    if (!error) {
      setResolved(undefined);
      return;
    }

    const sync = humanizeError(error);
    setResolved(sync);

    if (sync === error && isErrorSelector(error)) {
      let cancelled = false;
      humanizeErrorAsync(error).then(result => {
        if (!cancelled) setResolved(result);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [error]);

  return resolved;
}
