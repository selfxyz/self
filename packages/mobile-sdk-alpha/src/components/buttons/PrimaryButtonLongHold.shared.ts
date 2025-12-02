// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ButtonProps } from './AbstractButton';

export interface HeldPrimaryButtonProps extends ButtonProps {
  onLongPress: () => void;
}

export type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`; // time in ms
//slate400 to slate800 but in rgb
export const ACTION_TIMER = 600;

export const COLORS: RGBA[] = ['rgba(30, 41, 59, 0.3)', 'rgba(30, 41, 59, 1)'];
