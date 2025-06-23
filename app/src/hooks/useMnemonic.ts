//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { ethers } from 'ethers';
import { useCallback, useState } from 'react';

import { useAuth } from '../providers/authProvider';

export default function useMnemonic() {
  const { getOrCreateMnemonic } = useAuth();
  const [mnemonic, setMnemonic] = useState<string[]>();

  const loadMnemonic = useCallback(async () => {
    const storedMnemonic = await getOrCreateMnemonic();
    if (!storedMnemonic) {
      return;
    }
    const { entropy } = storedMnemonic.data;
    setMnemonic(ethers.Mnemonic.fromEntropy(entropy).phrase.split(' '));
  }, []);

  return {
    loadMnemonic,
    mnemonic,
  };
}
