// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import NetInfo from '@react-native-community/netinfo';

import { apiPingUrl } from '@/consts/links';

NetInfo.configure({
  reachabilityUrl: apiPingUrl,
  reachabilityTest: async response => response.status === 200,
  reachabilityLongTimeout: 60_000,
  reachabilityShortTimeout: 5_000,
  reachabilityRequestTimeout: 15_000,
  reachabilityShouldRun: () => true,
});

export { useNetInfo } from '@react-native-community/netinfo';
