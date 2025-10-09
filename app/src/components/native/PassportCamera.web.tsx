// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect } from 'react';

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

// TODO: Web find a lightweight ocr or mrz scanner.

export interface PassportCameraProps {
  isMounted: boolean;
  onPassportRead: (
    error: Error | null,
    mrzData?: ReturnType<SelfClient['extractMRZInfo']>,
  ) => void;
}

export const PassportCamera: React.FC<PassportCameraProps> = ({
  onPassportRead,
  isMounted,
}) => {
  const selfClient = useSelfClient();
  const _onPassportRead = useCallback(
    (mrz: string) => {
      if (!isMounted) {
        return;
      }
      onPassportRead(null, selfClient.extractMRZInfo(mrz));
    },
    [onPassportRead, isMounted, selfClient],
  );
  const handleError = useCallback(() => {
    if (!isMounted) {
      return;
    }
    const error = new Error('Passport camera not implemented for web yet');
    onPassportRead(error);
  }, [onPassportRead, isMounted]);

  // Web stub - no functionality yet
  useEffect(() => {
    // Simulate that the component is not ready for web
    if (isMounted) {
      console.warn('PassportCamera: Web implementation not yet available');
      // Optionally trigger an error after a short delay to indicate not implemented
      const timer = setTimeout(() => {
        handleError();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMounted, handleError, _onPassportRead]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '16px',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div>
        <div style={{ marginBottom: '16px' }}>📷 Passport Camera</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>
          Web implementation coming soon
        </div>
      </div>
    </div>
  );
};
