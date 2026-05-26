// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Location } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Button,
  colors,
  fontFamily,
  fontWeight,
  LeftArrowIcon,
  SecretPhraseInput,
  spacing,
  TopNavigationDialogue,
} from '@selfxyz/euclid';
import {
  finalizeRecoveredDocumentRegistration,
  loadSelectedDocument,
  validateRecoverySecretForDocument,
} from '@selfxyz/mobile-sdk-alpha/browser';
import { bridgeStorageAdapter } from '@selfxyz/webview-bridge/adapters';

import { useBridge } from '../../providers/BridgeProvider';
import { useSelfClient } from '../../providers/SelfClientProvider';
import type { NavState } from '../../types/navState';
import { WEB_SAFE_AREA } from '../../utils/insets';
import {
  derivePrivateKey,
  readStoredSecretSnapshot,
  restoreSecretFromMnemonic,
  restoreStoredSecretSnapshot,
} from '../../utils/secretManager';

import { validateMnemonic } from '@scure/bip39';
import { wordlist as bip39EnglishWordlist } from '@scure/bip39/wordlists/english';

const WORD_COUNT = 24;
const VALID_WORDS = new Set(bip39EnglishWordlist);
const VALID_LENGTHS = new Set([12, 15, 18, 21, 24]);
const MAX_MISMATCH_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const EMPTY_WORDS = Array.from<string>({ length: WORD_COUNT }).fill('');

const instruction = 'Enter your recovery phrase to restore your account, registered IDs, and activity history';

class RecoveryFlowError extends Error {
  constructor(
    readonly reason:
      | 'document_unavailable'
      | 'storage_write_failed'
      | 'document_finalization_failed'
      | 'unexpected_error',
  ) {
    super(reason);
  }
}

function getNextPath(location: Location): string | null {
  const state = location.state as Partial<NavState> | null;
  return state?.nextPath ?? null;
}

export const SecretPhraseInputScreen: React.FC = () => {
  // Phrase possession is the authentication gate for account recovery.
  const location = useLocation();
  const navigate = useNavigate();
  const bridge = useBridge();
  const { analytics, client, haptic } = useSelfClient();
  const storage = useMemo(() => bridgeStorageAdapter(bridge), [bridge]);
  const isMountedRef = useRef(true);
  const [words, setWords] = useState<string[]>(() => [...EMPTY_WORDS]);
  const [errorIndices, setErrorIndices] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mismatchAttempts, setMismatchAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);

  const nextPath = getNextPath(location);
  const lockoutSecondsRemaining = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
  const isLocked = lockoutSecondsRemaining > 0;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLocked) {
      if (lockedUntil !== null && mismatchAttempts >= MAX_MISMATCH_ATTEMPTS) {
        setLockedUntil(null);
        setMismatchAttempts(0);
      }
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownTick(current => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isLocked, lockedUntil, mismatchAttempts]);

  useEffect(() => {
    if (cooldownTick === 0 || !isLocked) {
      return;
    }

    if (lockedUntil !== null && lockedUntil <= Date.now()) {
      setLockedUntil(null);
      setMismatchAttempts(0);
      setErrorMessage(null);
    }
  }, [cooldownTick, isLocked, lockedUntil]);

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const handleWordChange = useCallback((index: number, word: string) => {
    setWords(previous => {
      const next = [...previous];
      next[index] = word;
      return next;
    });
    setErrorIndices(previous => previous.filter(currentIndex => currentIndex !== index));
    setErrorMessage(null);
  }, []);

  const handleWordBlur = useCallback((index: number) => {
    setWords(currentWords => {
      const word = currentWords[index]?.trim() ?? '';
      if (word !== '' && !VALID_WORDS.has(word)) {
        setErrorIndices(previous => (previous.includes(index) ? previous : [...previous, index]));
      }
      return currentWords;
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (isSubmitting || isLocked) {
      return;
    }

    const normalizedWords = words.map(word => word.trim().toLowerCase());
    const submittedWords = normalizedWords.filter(Boolean);
    const mnemonic = submittedWords.join(' ');
    let derivedSecret: string | null = null;

    setIsSubmitting(true);

    try {
      if (!VALID_LENGTHS.has(submittedWords.length) || !validateMnemonic(mnemonic, bip39EnglishWordlist)) {
        const invalidIndices = normalizedWords.reduce<number[]>((indices, word, index) => {
          if (word !== '' && !VALID_WORDS.has(word)) {
            indices.push(index);
          }
          return indices;
        }, []);

        if (isMountedRef.current) {
          setErrorIndices(invalidIndices);
          setErrorMessage('Enter a valid recovery phrase');
        }

        haptic.trigger('error');
        analytics.trackEvent('recovery_phrase_rejected', {
          reason: 'invalid_mnemonic',
          wordCount: submittedWords.length,
        });
        return;
      }

      const selectedDocument = await loadSelectedDocument(client);
      if (selectedDocument === null) {
        throw new RecoveryFlowError('document_unavailable');
      }

      const hasRealDocument = !selectedDocument.metadata.mock;

      if (!hasRealDocument) {
        await restoreSecretFromMnemonic(storage, mnemonic);

        if (isMountedRef.current) {
          setErrorIndices([]);
          setErrorMessage(null);
          setWords([...EMPTY_WORDS]);
        }

        haptic.trigger('success');
        analytics.trackEvent('recovery_phrase_recovered', { documentCategory: 'none' });
        if (isMountedRef.current) {
          navigate('/tunnel/kyc', { replace: true });
        }
        return;
      } else {
        derivedSecret = derivePrivateKey(mnemonic);
        const validationResult = await validateRecoverySecretForDocument(client, selectedDocument.data, derivedSecret);

        if (!validationResult.isRegistered) {
          const nextAttempts = mismatchAttempts + 1;
          const nextLockedUntil = nextAttempts >= MAX_MISMATCH_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;

          if (isMountedRef.current) {
            setMismatchAttempts(nextAttempts);
            setLockedUntil(nextLockedUntil);
            setErrorMessage(
              nextLockedUntil
                ? `Too many recovery attempts. Try again in ${Math.ceil(LOCKOUT_MS / 1000)} seconds`
                : 'Recovery phrase does not match this identity',
            );
          }

          haptic.trigger('error');
          analytics.trackEvent('recovery_phrase_validation_failed', {
            reason: 'secret_mismatch',
            attemptsRemaining: Math.max(MAX_MISMATCH_ATTEMPTS - nextAttempts, 0),
          });
          return;
        }

        const previousSnapshot = await readStoredSecretSnapshot(storage);

        try {
          await restoreSecretFromMnemonic(storage, mnemonic);
        } catch {
          await restoreStoredSecretSnapshot(storage, previousSnapshot);
          throw new RecoveryFlowError('storage_write_failed');
        }

        try {
          await finalizeRecoveredDocumentRegistration(client, selectedDocument.data, validationResult.csca);
        } catch {
          await restoreStoredSecretSnapshot(storage, previousSnapshot);
          throw new RecoveryFlowError('document_finalization_failed');
        }
      }

      if (isMountedRef.current) {
        setErrorIndices([]);
        setErrorMessage(null);
        setMismatchAttempts(0);
        setLockedUntil(null);
        setWords([...EMPTY_WORDS]);
      }

      haptic.trigger('success');
      analytics.trackEvent('recovery_phrase_recovered', {
        documentCategory: selectedDocument.data.documentCategory,
      });
      if (isMountedRef.current) {
        if (nextPath) {
          navigate(nextPath, { replace: true });
        } else {
          navigate('/recovery/success');
        }
      }
    } catch (error) {
      const reason = error instanceof RecoveryFlowError ? error.reason : 'unexpected_error';

      haptic.trigger('error');
      analytics.trackEvent('recovery_phrase_failed', {
        reason,
      });
      if (isMountedRef.current) {
        navigate('/recovery/failure', {
          replace: true,
          state: nextPath ? ({ nextPath } satisfies Partial<NavState>) : undefined,
        });
      }
    } finally {
      derivedSecret = null;
      if (isMountedRef.current) {
        setWords([...EMPTY_WORDS]);
        setIsSubmitting(false);
      }
    }
  }, [analytics, client, haptic, isLocked, isSubmitting, mismatchAttempts, navigate, nextPath, storage, words]);

  return (
    <div
      style={{ ...styles.container, paddingTop: WEB_SAFE_AREA.insets.top, paddingBottom: WEB_SAFE_AREA.insets.bottom }}
    >
      <div style={styles.header}>
        <TopNavigationDialogue
          variant="Primary"
          label="Recovery Phrase"
          escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
          infoIcon={({ size }) => <div style={{ width: size, height: size }} />}
          onEscape={handleBack}
          onPressInfo={() => {}}
        />
      </div>

      <div style={styles.content}>
        <span style={styles.instruction}>{instruction}</span>
        <SecretPhraseInput
          words={words}
          onWordChange={handleWordChange}
          onWordBlur={handleWordBlur}
          errorIndices={errorIndices}
          wordCount={WORD_COUNT}
        />
        {errorMessage ? (
          <div aria-live="polite" role="alert" style={styles.errorMessage}>
            {isLocked && lockoutSecondsRemaining > 0
              ? `Too many recovery attempts. Try again in ${lockoutSecondsRemaining} seconds`
              : errorMessage}
          </div>
        ) : null}
        <Button
          variant="secondary-label"
          text={isSubmitting ? 'Restoring…' : isLocked ? `Try again in ${lockoutSecondsRemaining}s` : 'Continue'}
          onPress={() => {
            void onSubmit();
          }}
          fullWidth
          disabled={isSubmitting || isLocked}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.slate50,
    boxSizing: 'border-box',
  },
  header: {
    backgroundColor: colors.slate50,
  },
  content: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: spacing.mdLg,
    padding: spacing.mdLg,
    paddingBottom: spacing.xlLg,
    boxSizing: 'border-box',
  },
  instruction: {
    fontFamily: fontFamily.dinOT,
    fontWeight: fontWeight.medium,
    fontSize: 18,
    color: colors.black,
    textAlign: 'center',
    lineHeight: '22px',
  },
  errorMessage: {
    fontFamily: fontFamily.dinOT,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    color: colors.red600,
    lineHeight: '20px',
    textAlign: 'center',
  },
};
