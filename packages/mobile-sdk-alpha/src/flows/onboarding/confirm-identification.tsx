// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import type { DocumentCategory } from '@selfxyz/common/utils/types';

import successAnimation from '../../animations/loading/success.json';
import { PrimaryButton } from '../../components';
import { DelayedLottieView } from '../../components/DelayedLottieView';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { PassportEvents, ProofEvents } from '../../constants/analytics';
import { black, white } from '../../constants/colors';
import { useSelfClient } from '../../context';
import { loadSelectedDocument } from '../../documents/utils';
import { notificationSuccess } from '../../haptic';
import { useSafeBottomPadding } from '../../hooks/useSafeBottomPadding';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { SdkEvents } from '../../types/events';
import type { SelfClient } from '../../types/public';

/*
  Screen to confirm identification ownership
  props:
    onBeforeConfirm - optional callback to run before confirming ownership (e.g., to request notification permissions)
*/
export const ConfirmIdentificationScreen = ({ onBeforeConfirm }: { onBeforeConfirm?: () => Promise<void> }) => {
  useEffect(() => {
    notificationSuccess();
  }, []);

  const selfClient = useSelfClient();

  const onPress = useCallback(async () => {
    await onBeforeConfirm?.();
    await onConfirm(selfClient);
  }, [onBeforeConfirm, selfClient]);

  // Calculate bottom padding to prevent button bleeding into system navigation
  // ExpandableBottomLayout.BottomSection handles safe areas internally
  const paddingBottom = useSafeBottomPadding(20);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <DelayedLottieView
          autoPlay
          loop={false}
          source={successAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection gap={20} paddingBottom={paddingBottom} backgroundColor={white}>
        <Title style={{ textAlign: 'center' }}>Confirm your identity</Title>
        <Description style={{ textAlign: 'center', paddingBottom: 20 }}>{getPreRegistrationDescription()}</Description>
        <PrimaryButton trackEvent={PassportEvents.OWNERSHIP_CONFIRMED} onPress={onPress}>
          Confirm
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

const getDocumentMetadata = async (selfClient: SelfClient) => {
  try {
    const selectedDocument = await loadSelectedDocument(selfClient);
    let metadata: {
      documentCategory?: DocumentCategory;
      signatureAlgorithm?: string;
      curveOrExponent?: string;
    };
    if (selectedDocument?.data?.documentCategory === 'aadhaar') {
      metadata = {
        documentCategory: 'aadhaar',
        signatureAlgorithm: 'rsa',
        curveOrExponent: '65537',
      } as const;
    } else {
      const passportData = selectedDocument?.data;
      metadata = {
        documentCategory: passportData?.documentCategory,
        signatureAlgorithm: passportData?.passportMetadata?.cscaSignatureAlgorithm,
        curveOrExponent: passportData?.passportMetadata?.cscaCurveOrExponent,
      } as const;
    }
    return metadata;
  } catch {
    // setting defaults on error
    return {
      documentCategory: 'passport' as const,
      signatureAlgorithm: 'rsa',
      curveOrExponent: '65537',
    };
  }
};

async function onConfirm(selfClient: SelfClient) {
  try {
    const documentMetadata = await getDocumentMetadata(selfClient);

    selfClient.emit(SdkEvents.DOCUMENT_OWNERSHIP_CONFIRMED, {
      documentCategory: documentMetadata.documentCategory,
      signatureAlgorithm: documentMetadata.signatureAlgorithm,
      curveOrExponent: documentMetadata.curveOrExponent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    selfClient.trackEvent(ProofEvents.PROVING_PROCESS_ERROR, {
      error: message,
    });
  }
}

/*
  Display this to users before they confirm ownership of a document
*/
function getPreRegistrationDescription() {
  return "By continuing, you certify that this passport, biometric ID or Aadhaar card belongs to you and is not stolen or forged. Once registered with Self, this document will be permanently linked to your identity and can't be linked to another one.";
}

const styles = StyleSheet.create({
  animation: {
    width: '125%',
    height: '125%',
  },
});
