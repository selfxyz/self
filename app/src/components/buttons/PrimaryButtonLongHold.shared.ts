// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { ButtonProps } from '@/components/buttons/AbstractButton';

export interface HeldPrimaryButtonProps extends ButtonProps {
  onLongPress: () => void;
}

export type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`; // time in ms
//slate400 to slate800 but in rgb
export const ACTION_TIMER = 600;

export const COLORS: RGBA[] = ['rgba(30, 41, 59, 0.3)', 'rgba(30, 41, 59, 1)'];
