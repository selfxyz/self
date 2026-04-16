// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';
import { View } from 'tamagui';

import { Caption, SecondaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import { slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import type { TipProps } from '@/components/Tips';
import Tips from '@/components/Tips';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import useOpenSupportForm from '@/hooks/useOpenSupportForm';
import SimpleScrolledTitleLayout from '@/layouts/SimpleScrolledTitleLayout';
import { flushAllAnalytics } from '@/services/analytics';
import {
  SUPPORT_FORM_BUTTON_TEXT,
  SUPPORT_FORM_TIP_MESSAGE,
} from '@/services/support';

const tips: TipProps[] = [
  {
    title: 'Ensure Valid QR Code',
    body: "Make sure you're scanning a QR code from a supported Self partner application.",
  },
  {
    title: 'Try Different Distances',
    body: 'If scanning fails, try moving your device closer to the QR code or increase the size of the QR code on the screen.',
  },
  {
    title: 'Proper Lighting',
    body: "Ensure there's adequate lighting in the room. QR codes need good contrast to be read properly.",
  },
  {
    title: 'Hold Steady',
    body: 'Keep your device steady while scanning to prevent blurry images that might not scan correctly.',
  },
  {
    title: 'Clean Lens',
    body: 'Make sure your camera lens is clean and free of smudges or debris that could interfere with scanning.',
  },
];

const tipsDeeplink: TipProps[] = [
  {
    title: 'Coming from another app/website?',
    body: SUPPORT_FORM_TIP_MESSAGE,
  },
];

const QRCodeTrouble: React.FC = () => {
  const openSupportForm = useOpenSupportForm();
  const go = useHapticNavigation('Home', { action: 'cancel' });

  // error screen, flush analytics
  useEffect(() => {
    flushAllAnalytics();
  }, []);

  return (
    <SimpleScrolledTitleLayout
      title="Having trouble scanning the QR code?"
      onDismiss={go}
      footer={
        <SecondaryButton onPress={openSupportForm}>
          {SUPPORT_FORM_BUTTON_TEXT}
        </SecondaryButton>
      }
    >
      <Caption size="large" style={{ color: slate500, marginBottom: 16 }}>
        Here are some tips to help you successfully scan the QR code:
      </Caption>
      <View marginBottom={24}>
        <Tips items={tips} />
        <Tips items={tipsDeeplink} />
      </View>
    </SimpleScrolledTitleLayout>
  );
};

export default QRCodeTrouble;
