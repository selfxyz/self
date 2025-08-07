// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

export type HapticOptions = {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
  pattern?: number[];
  increaseIosIntensity?: boolean;
};

export type HapticType =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

export const defaultOptions: HapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
  pattern: [50, 100, 50],
  increaseIosIntensity: true,
};
