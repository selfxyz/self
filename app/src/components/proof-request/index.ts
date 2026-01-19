// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type { BottomActionBarProps } from '@/components/proof-request/BottomActionBar';
export type { BottomVerifyBarProps } from '@/components/proof-request/BottomVerifyBar';

// Metadata bar
export type { ConnectedWalletBadgeProps } from '@/components/proof-request/ConnectedWalletBadge';

export type { DisclosureItemProps } from '@/components/proof-request/DisclosureItem';

export type { IconProps } from '@/components/proof-request/icons';

// Header section
export type { ProofMetadataBarProps } from '@/components/proof-request/ProofMetadataBar';

/**
 * Proof Request Component Library
 *
 * Shared components for proof request preview and proving screens.
 * These components implement the Figma designs 15234:9267 and 15234:9322.
 */
// Main card component
export type { ProofRequestCardProps } from '@/components/proof-request/ProofRequestCard';
export type { ProofRequestHeaderProps } from '@/components/proof-request/ProofRequestHeader';

export type { WalletAddressModalProps } from '@/components/proof-request/WalletAddressModal';

// Icons
export { BottomActionBar } from '@/components/proof-request/BottomActionBar';
export { BottomVerifyBar } from '@/components/proof-request/BottomVerifyBar';

// Bottom action bar
export {
  ChevronUpDownIcon,
  CopyIcon,
  DocumentIcon,
  FilledCircleIcon,
  InfoCircleIcon,
  WalletIcon,
} from '@/components/proof-request/icons';

export {
  ConnectedWalletBadge,
  truncateAddress,
} from '@/components/proof-request/ConnectedWalletBadge';

// Connected wallet badge
export { DisclosureItem } from '@/components/proof-request/DisclosureItem';

// Disclosure item
export {
  ProofMetadataBar,
  formatTimestamp,
} from '@/components/proof-request/ProofMetadataBar';

export { ProofRequestCard } from '@/components/proof-request/ProofRequestCard';

export { ProofRequestHeader } from '@/components/proof-request/ProofRequestHeader';

export { WalletAddressModal } from '@/components/proof-request/WalletAddressModal';

// Design tokens
export {
  proofRequestColors,
  proofRequestSpacing,
} from '@/components/proof-request/designTokens';
