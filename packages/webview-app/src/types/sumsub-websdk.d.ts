// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

declare module '@sumsub/websdk' {
  interface SnsWebSdkConf {
    lang?: string;
    theme?: string;
    email?: string;
    phone?: string;
    i18n?: Record<string, Record<string, string>>;
    uiConf?: Record<string, unknown>;
  }

  interface SnsWebSdkOptions {
    addViewportTag?: boolean;
    adaptIframeHeight?: boolean;
  }

  interface SnsWebSdkBuilder {
    withConf(conf: SnsWebSdkConf): SnsWebSdkBuilder;
    withOptions(options: SnsWebSdkOptions): SnsWebSdkBuilder;
    on(event: string, handler: (payload: any) => void): SnsWebSdkBuilder;
    onMessage(handler: (type: string, payload: unknown) => void): SnsWebSdkBuilder;
    build(): SnsWebSdkInstance;
  }

  interface SnsWebSdkInstance {
    launch(container: HTMLElement): void;
    destroy(): void;
  }

  interface SnsWebSdk {
    init(accessToken: string, tokenRefreshCallback: () => Promise<string>): SnsWebSdkBuilder;
  }

  const snsWebSdk: SnsWebSdk;
  export default snsWebSdk;
}
