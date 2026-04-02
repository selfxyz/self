// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp, SelfAppDisclosureConfig, SelfClient } from '@selfxyz/mobile-sdk-alpha/browser';

import type { ParsedVerificationRequestContext } from './verificationRequest';

type EndpointType = 'https' | 'celo' | 'staging_celo' | 'staging_https';
const VALID_ENDPOINT_TYPES = new Set<string>(['https', 'celo', 'staging_celo', 'staging_https']);

const BOOLEAN_DISCLOSURE_KEYS = new Set([
  'issuing_state',
  'name',
  'passport_number',
  'nationality',
  'date_of_birth',
  'gender',
  'expiry_date',
  'ofac',
]);

function parseDisclosureConfig(disclosures?: string[], excludedCountries?: string[]): SelfAppDisclosureConfig {
  const config: Record<string, unknown> = {};
  if (disclosures) {
    for (const d of disclosures) {
      if (BOOLEAN_DISCLOSURE_KEYS.has(d)) {
        config[d] = true;
      } else if (d.startsWith('minimumAge:')) {
        const age = parseInt(d.split(':')[1], 10);
        if (!isNaN(age)) config.minimum_age = age;
      }
    }
  }
  if (excludedCountries && excludedCountries.length > 0) {
    config.excluded_countries = excludedCountries;
  }
  return config as SelfAppDisclosureConfig;
}

function resolveEndpointType(explicit: string | undefined, endpoint: string, isStaging: boolean): EndpointType {
  if (explicit && VALID_ENDPOINT_TYPES.has(explicit)) {
    return explicit as EndpointType;
  }
  if (endpoint.startsWith('0x')) {
    return isStaging ? 'staging_celo' : 'celo';
  }
  return isStaging ? 'staging_https' : 'https';
}

export function initSelfAppFromRequest(client: SelfClient, ctx: ParsedVerificationRequestContext): void {
  const isStaging = ctx.environment === 'stg';
  const endpointType = resolveEndpointType(ctx.endpointType, ctx.appEndpoint || '', isStaging);

  const defaultChainID = endpointType === 'staging_celo' || endpointType === 'staging_https' ? 11142220 : 42220;

  const selfApp: SelfApp = {
    appName: ctx.appName,
    logoBase64: '',
    endpointType,
    endpoint: ctx.appEndpoint || '',
    deeplinkCallback: '',
    header: '',
    scope: ctx.request.scope ?? '',
    sessionId: ctx.verificationId ?? `webview-${Date.now()}`,
    userId: ctx.request.userId ?? '',
    userIdType: ctx.userIdType === 'hex' ? 'hex' : 'uuid',
    devMode: isStaging,
    disclosures: parseDisclosureConfig(ctx.request.disclosures, ctx.excludedCountries),
    version: ctx.version,
    chainID: (ctx.chainID ?? defaultChainID) as 42220 | 11142220,
    userDefinedData: ctx.userDefinedData ?? '',
    selfDefinedData: ctx.selfDefinedData ?? '',
  };

  client.getSelfAppState().setSelfApp(selfApp);
}
