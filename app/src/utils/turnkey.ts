// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useMemo, useState } from 'react';
import type { Wallet as TurnkeyWallet } from '@turnkey/core';
import { AuthState, useTurnkey } from '@turnkey/react-native-wallet-kit';

import { useSettingStore } from '@/stores/settingStore';

export function useTurnkeyUtils() {
  const turnkey = useTurnkey();
  const {
    handleGoogleOauth,
    fetchWallets,
    exportWallet,
    importWallet,
    authState,
    logout,
  } = turnkey;

  const setTurnkeyBackupEnabled = useSettingStore(
    state => state.setTurnkeyBackupEnabled,
  );
  const turnkeyBackupEnabled = useSettingStore(
    state => state.turnkeyBackupEnabled,
  );
  const [turnkeyWallets, setTurnkeyWallets] = useState<Array<TurnkeyWallet>>(
    [],
  );

  const authenticateIfNeeded = useCallback(
    async (authenticate: boolean = true): Promise<void> => {
      if (!authenticate || authState !== AuthState.Unauthenticated) {
        return;
      }
      await handleGoogleOauth();
    },
    [authState, handleGoogleOauth],
  );

  const refreshWallets = useCallback(async () => {
    const fetchedWallets = await fetchWallets();
    setTurnkeyWallets(fetchedWallets);
  }, [fetchWallets]);

  return useMemo(
    () => ({
      isAuthenticated: (): boolean => {
        return authState === AuthState.Authenticated;
      },

      restoreAccount: async (
        authenticate: boolean = true,
      ): Promise<{
        message: string;
        error?: string;
      }> => {
        try {
          await authenticateIfNeeded(authenticate);
          const fetchedWallets = await fetchWallets();
          if (fetchedWallets.length > 0) {
            if (!turnkeyBackupEnabled) {
              setTurnkeyBackupEnabled(true);
            }
            return { message: 'Wallet restored successfully' };
          }
          return { message: 'No wallets found' };
        } catch (error) {
          console.error('restoreAccount error:', error);
          return {
            message: 'Failed to restore wallet',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },

      backupAccount: async (
        mnemonic: string,
        authenticate: boolean = true,
      ): Promise<void> => {
        await authenticateIfNeeded(authenticate);
        const fetchedWallets = await fetchWallets();

        if (fetchedWallets.length > 0) {
          // Get the existing mnemonic to compare
          const existingMnemonic = await exportWallet({
            walletId: fetchedWallets[0].walletId,
            decrypt: true,
          });

          // Compare mnemonics (normalize whitespace)
          const normalizedExisting = existingMnemonic.trim().toLowerCase();
          const normalizedProvided = mnemonic.trim().toLowerCase();

          if (normalizedExisting === normalizedProvided) {
            // Same wallet, already backed up
            if (!turnkeyBackupEnabled) {
              setTurnkeyBackupEnabled(true);
            }
            throw new Error('already_backed_up');
          } else {
            // Different wallet exists
            throw new Error('already_exists');
          }
        }

        await importWallet({
          mnemonic,
          walletName: `Self-${new Date().toISOString()}`,
        });
        setTurnkeyBackupEnabled(true);

        await refreshWallets();
      },

      getMnemonic: async (authenticate: boolean = true): Promise<string> => {
        await authenticateIfNeeded(authenticate);
        const fetchedWallets = await fetchWallets();
        if (fetchedWallets.length === 0) {
          throw new Error('No wallets found');
        }
        const exportedWallet = await exportWallet({
          walletId: fetchedWallets[0].walletId,
          decrypt: true,
        });
        return exportedWallet;
      },
      logout,
      turnkeyWallets,
      refreshWallets,
    }),
    [
      logout,
      turnkeyWallets,
      refreshWallets,
      authState,
      authenticateIfNeeded,
      fetchWallets,
      turnkeyBackupEnabled,
      setTurnkeyBackupEnabled,
      importWallet,
      exportWallet,
    ],
  );
}
