// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';

import type { TipProps } from '@/components/Tips';
import Tips from '@/components/Tips';
import { Caption } from '@/components/typography/Caption';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import Activity from '@/images/icons/activity.svg';
import PassportCameraBulb from '@/images/icons/passport_camera_bulb.svg';
import PassportCameraScan from '@/images/icons/passport_camera_scan.svg';
import QrScan from '@/images/icons/qr_scan.svg';
import Star from '@/images/icons/star.svg';
import SimpleScrolledTitleLayout from '@/layouts/SimpleScrolledTitleLayout';
import analytics from '@/utils/analytics';
import { slate500 } from '@/utils/colors';

const { flush: flushAnalytics } = analytics();

const tips: TipProps[] = [
  {
    title: 'Use Good Lighting',
    body: 'Try scanning in a well-lit area to reduce glare or shadows on the ID page.',
    icon: <PassportCameraBulb width={28} height={28} />,
  },
  {
    title: 'Lay It Flat',
    body: 'Place your ID on a stable, flat surface to keep the ID page smooth and fully visible.',
    icon: <Star width={28} height={28} />,
  },
  {
    title: 'Hold Steady',
    body: 'Keep your phone as still as possible; any movement can cause blurry images.',
    icon: <Activity width={28} height={28} />,
  },
  {
    title: 'Fill the Frame',
    body: 'Make sure the entire ID page is within the camera view, with all edges visible.',
    icon: <QrScan width={28} height={28} />,
  },
  {
    title: 'Avoid Reflections',
    body: 'Slightly tilt the ID or your phone if bright lights create glare on the page.',
    icon: <PassportCameraScan width={28} height={28} />,
  },
];

const DocumentCameraTroubleScreen: React.FC = () => {
  const go = useHapticNavigation('DocumentCamera', { action: 'cancel' });

  // error screen, flush analytics
  useEffect(() => {
    flushAnalytics();
  }, []);

  return (
    <SimpleScrolledTitleLayout
      title="Having trouble scanning your ID?"
      onDismiss={go}
      header={
        <Caption size="large" color={slate500} marginBottom={18}>
          Here are a few tips that might help:
        </Caption>
      }
      footer={
        <Caption size="large" color={slate500}>
          Following these steps should help your phone's camera capture the ID
          page quickly and clearly!
        </Caption>
      }
    >
      <Tips items={tips} />
    </SimpleScrolledTitleLayout>
  );
};

export default DocumentCameraTroubleScreen;
