// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Pure data + helpers for cluster-close behavior. Kept React-free so it
 * can be unit-tested without dragging the SDK / Euclid / bridge graph
 * into the test loader.
 *
 * The hook that consumes this lives in `clusterClose.ts`.
 */

export type Cluster =
  | 'home'
  | 'tour'
  | 'pick-country'
  | 'pick-id-type'
  | 'pick-provider'
  | 'capture'
  | 'register'
  | 'disclose'
  | 'receipts'
  | 'history'
  | 'notify'
  | 'backup-phrase'
  | 'recover'
  | 'docs'
  | 'settings'
  | 'points'
  | 'account'
  | 'embed'
  | 'onboarding' // NAV-11 deferred screens (backup/signin/conflict)
  | 'dev'
  | 'coming-soon';

export type EmbedCloseTarget =
  | { kind: 'dismiss-only' }
  | { kind: 'set-result'; errorCode: string; errorMessage: string };

export interface CloseTarget {
  /** Self-app close: navigate here with `{ replace: true }`. */
  selfApp: string;
  /** Embed close: dismiss the host or set a result then dismiss. */
  embed: EmbedCloseTarget;
}

const DISMISS_ONLY: EmbedCloseTarget = { kind: 'dismiss-only' };
const USER_CANCELLED: EmbedCloseTarget = {
  kind: 'set-result',
  errorCode: 'user_cancelled',
  errorMessage: 'User dismissed the verification flow.',
};

export const CLUSTER_CLOSE: Record<Cluster, CloseTarget> = {
  home: { selfApp: '/', embed: DISMISS_ONLY },
  tour: { selfApp: '/', embed: USER_CANCELLED },
  'pick-country': { selfApp: '/', embed: USER_CANCELLED },
  'pick-id-type': { selfApp: '/', embed: USER_CANCELLED },
  'pick-provider': { selfApp: '/', embed: USER_CANCELLED },
  capture: { selfApp: '/', embed: USER_CANCELLED },
  register: { selfApp: '/', embed: USER_CANCELLED },
  disclose: { selfApp: '/history', embed: USER_CANCELLED },
  receipts: { selfApp: '/history', embed: DISMISS_ONLY },
  history: { selfApp: '/', embed: DISMISS_ONLY },
  notify: { selfApp: '/', embed: DISMISS_ONLY },
  'backup-phrase': { selfApp: '/', embed: DISMISS_ONLY },
  recover: { selfApp: '/settings/security', embed: DISMISS_ONLY },
  docs: { selfApp: '/docs', embed: DISMISS_ONLY },
  settings: { selfApp: '/', embed: DISMISS_ONLY },
  points: { selfApp: '/', embed: DISMISS_ONLY },
  account: { selfApp: '/', embed: DISMISS_ONLY },
  embed: { selfApp: '/', embed: DISMISS_ONLY },
  onboarding: { selfApp: '/', embed: USER_CANCELLED },
  dev: { selfApp: '/', embed: DISMISS_ONLY },
  'coming-soon': { selfApp: '/', embed: DISMISS_ONLY },
};

const KNOWN_CLUSTERS = new Set<Cluster>(Object.keys(CLUSTER_CLOSE) as Cluster[]);

/**
 * Infer the cluster from a pathname's first segment. Falls back to `home`
 * when the pathname doesn't match any known cluster (defensive — the
 * invariant test guarantees real routes always match).
 */
export function inferClusterFromPath(pathname: string): Cluster {
  const first = pathname.split('/').filter(Boolean)[0];
  if (first && KNOWN_CLUSTERS.has(first as Cluster)) {
    return first as Cluster;
  }
  return 'home';
}
