// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type { BottomActionBarProps } from '@/components/proof-request/BottomActionBar';

// Metadata bar
export type { ConnectedWalletBadgeProps } from '@/components/proof-request/ConnectedWalletBadge';

export type { WalletAddressModalProps } from '@/components/proof-request/WalletAddressModal';

export type { DisclosureItemProps } from '@/components/proof-request/DisclosureItem';

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

export { BottomActionBar } from '@/components/proof-request/BottomActionBar';

// Bottom action bar
export {
  ConnectedWalletBadge,
  truncateAddress,
} from '@/components/proof-request/ConnectedWalletBadge';

export { DisclosureItem } from '@/components/proof-request/DisclosureItem';

// Connected wallet badge
export {
  ProofMetadataBar,
  formatTimestamp,
} from '@/components/proof-request/ProofMetadataBar';

// Disclosure item
export { ProofRequestCard } from '@/components/proof-request/ProofRequestCard';

export { ProofRequestHeader } from '@/components/proof-request/ProofRequestHeader';

export { WalletAddressModal } from '@/components/proof-request/WalletAddressModal';

// Icons
export {
  ChevronUpDownIcon,
  CopyIcon,
  DocumentIcon,
  FilledCircleIcon,
  InfoCircleIcon,
  WalletIcon,
} from '@/components/proof-request/icons';

export type { IconProps } from '@/components/proof-request/icons';

// Design tokens
export {
  proofRequestColors,
  proofRequestSpacing,
} from '@/components/proof-request/designTokens';
