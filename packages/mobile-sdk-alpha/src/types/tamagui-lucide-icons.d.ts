// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

declare module '@tamagui/lucide-icons' {
  import type { ComponentType } from 'react';

  export interface IconProps {
    size?: number;
    color?: string;
    opacity?: number;
  }

  export const ArrowLeft: ComponentType<IconProps>;
  export const ArrowRight: ComponentType<IconProps>;
  export const ExternalLink: ComponentType<IconProps>;
  export const RotateCcw: ComponentType<IconProps>;
  export const X: ComponentType<IconProps>;
}
