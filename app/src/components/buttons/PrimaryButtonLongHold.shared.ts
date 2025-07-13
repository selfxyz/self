// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { ButtonProps } from './AbstractButton';

export type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;

export const ACTION_TIMER = 600; // time in ms
//slate400 to slate800 but in rgb
export const COLORS: RGBA[] = ['rgba(30, 41, 59, 0.3)', 'rgba(30, 41, 59, 1)'];

export interface HeldPrimaryButtonProps extends ButtonProps {
  onLongPress: () => void;
}
