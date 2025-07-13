// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback, useState } from 'react';

import { ensureCameraPermission } from '../utils/cameraPermission';

interface UseCameraPermissionProps {
  isMounted: boolean;
  onError: (error: Error) => void;
}

export const useCameraPermission = ({
  isMounted,
  onError,
}: UseCameraPermissionProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const checkAndRequestPermission = useCallback(async () => {
    const result = await ensureCameraPermission();
    setHasPermission(result.granted);

    if (!result.granted && result.error) {
      onError(result.error);
    }
  }, [onError]);

  // Check permission on mount
  React.useEffect(() => {
    if (isMounted && hasPermission === null) {
      checkAndRequestPermission();
    }
  }, [isMounted, hasPermission, checkAndRequestPermission]);

  return {
    hasPermission,
    checkAndRequestPermission,
  };
};
