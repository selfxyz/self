// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

declare module '@sumsub/react-native-mobilesdk-module' {
  export interface SumsubEvent {
    eventType: string;
    payload: Record<string, unknown>;
  }

  export interface SumsubHandlers {
    onStatusChanged?: (event: SumsubStatusChangedEvent) => void;
    onLog?: (event: SumsubLogEvent) => void;
    onEvent?: (event: SumsubEvent) => void;
  }

  export interface SumsubLogEvent {
    message: string;
  }

  export interface SumsubResult {
    success: boolean;
    status: string;
    errorType?: string;
    errorMsg?: string;
  }

  export interface SumsubSDK {
    withHandlers(handlers: SumsubHandlers): SumsubSDK;
    withDebug(debug: boolean): SumsubSDK;
    withLocale(locale: string): SumsubSDK;
    withAnalyticsEnabled(enabled: boolean): SumsubSDK;
    withAutoCloseOnApprove(seconds: number): SumsubSDK;
    withApplicantConf(config: { email?: string; phone?: string }): SumsubSDK;
    withPreferredDocumentDefinitions(
      definitions: Record<string, { idDocType: string; country: string }>,
    ): SumsubSDK;
    withDisableMLKit(disable: boolean): SumsubSDK;
    withStrings(strings: Record<string, string>): SumsubSDK;
    build(): SumsubSDK;
    launch(): Promise<SumsubResult>;
    dismiss(): void;
  }

  export interface SumsubStatusChangedEvent {
    prevStatus: string;
    newStatus: string;
  }

  export default class SNSMobileSDK {
    static init(
      accessToken: string,
      tokenExpirationHandler: () => Promise<string>,
    ): SumsubSDK;
  }
}
