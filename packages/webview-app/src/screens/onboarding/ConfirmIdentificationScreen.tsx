// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { StatusState } from '@selfxyz/euclid';
import { storeDocumentWithDeduplication } from '@selfxyz/mobile-sdk-alpha/browser';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { clearKycResult, getKycResult } from '../../stores/kycResultStore';
import { buildKycDocument } from '../../utils/buildKycDocument';

export const ConfirmIdentificationScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, client, haptic, lifecycle } = useSelfClient();
  const { request, verificationId } = useVerificationRequest();
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Mock flow (dev only) passes nextPath via location state; real flow uses kycResultStore
  const { nextPath, countryCode, documentType } =
    (location.state as { nextPath?: string; countryCode?: string; documentType?: string } | null) ?? {};

  const kycResult = getKycResult();
  const isRealFlow = !!kycResult?.attestation;
  const isMockFlow = !isRealFlow && !!nextPath && import.meta.env.DEV;

  useEffect(() => {
    if (!isRealFlow && !isMockFlow) {
      navigate('/onboarding/id-type', { replace: true });
      return;
    }
    haptic.trigger('success');
  }, [haptic, isRealFlow, isMockFlow, navigate]);

  const onConfirm = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      // Mock flow (dev only): navigate to next path without persistence
      if (isMockFlow && nextPath) {
        haptic.trigger('selection');
        analytics.trackEvent('ownership_confirmed', { nextPath });
        navigate(nextPath, { replace: true, state: { countryCode, documentType } });
        return;
      }

      if (!kycResult?.attestation) return;

      haptic.trigger('selection');
      analytics.trackEvent('ownership_confirmed');
      setError(null);

      const kycData = buildKycDocument(kycResult);
      const documentId = await storeDocumentWithDeduplication(client, kycData);

      await lifecycle.setResult({
        success: true,
        userId: request.userId,
        verificationId,
        claims: {
          resultType: 'documentOwnershipConfirmed',
          documentId,
        },
      });

      analytics.trackEvent('kyc_document_stored', { documentId });
      clearKycResult();
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      analytics.trackEvent('kyc_document_store_error', { error: message });
      setError(message);
    } finally {
      submittingRef.current = false;
    }
  }, [
    analytics,
    client,
    countryCode,
    documentType,
    haptic,
    isMockFlow,
    kycResult,
    lifecycle,
    navigate,
    nextPath,
    request.userId,
    verificationId,
  ]);

  if (!isRealFlow && !isMockFlow) return null;

  if (error) {
    return (
      <StatusState
        variant="fail"
        title="Something went wrong"
        description="We couldn't save your identity document. Please try again."
        buttonText="Retry"
        onButtonPress={onConfirm}
      />
    );
  }

  return (
    <>
      <MockRegistrationFailureButton />
      <StatusState
        variant="success"
        title="Confirm your identity"
        description="By continuing, you certify that this passport, biometric ID or Aadhaar card belongs to you and is not stolen or forged. Once registered with Self, this document will be permanently linked to your identity and can't be linked to another one."
        animationSource="/animations/proof-success.json"
        animationSize={240}
        loopAnimation={false}
        buttonText="Confirm"
        onButtonPress={onConfirm}
      />
    </>
  );
};
