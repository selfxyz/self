import type { CSSProperties } from 'react';

/** Detail payload for the self:success event */
export interface SuccessDetail {
  verified: boolean;
  sessionId: string;
  token?: string;
  claims?: Record<string, unknown>;
}

/** Detail payload for the self:error event */
export interface ErrorDetail {
  errorCode?: string;
  reason?: string;
}

/** Detail payload for the self:status event */
export interface StatusDetail {
  step: number;
  label: string;
}

/** Detail payload for the self:already-verified event */
export interface AlreadyVerifiedDetail {
  scope: string;
  verifiedAt: number;
  token?: string;
}

export interface SelfVerifyProps {
  /** App ID from verify-service registration. Auto-fetches scope/endpoint/disclosures. */
  appId?: string;

  /** App name displayed in the widget */
  appName?: string;
  /** Cryptographic scope (auto-generated if using appId) */
  appScope?: string;
  /** Webhook endpoint (auto-generated if using appId) */
  appEndpoint?: string;

  /** Verification preset: 'human', 'age-18', 'age-21', 'kyc-basic', 'kyc-full' */
  preset?: string;
  /** Fine-grained disclosure configuration */
  disclosures?: Record<string, unknown>;

  /** QR code size in pixels */
  size?: number;
  /** Enable dark mode */
  darkMode?: boolean;
  /** Custom logo URL */
  logo?: string;
  /** Custom description text */
  description?: string;

  /** Communication mode: 'websocket' | 'redirect' | 'token' */
  mode?: 'websocket' | 'redirect' | 'token';
  /** Session TTL in seconds for localStorage cache */
  sessionTtl?: number;
  /** Custom user/session identifier */
  userId?: string;
  /** Endpoint type hint */
  endpointType?: string;
  /** Custom verify-service URL */
  verifyUrl?: string;
  /** Custom WebSocket relay URL */
  wsUrl?: string;
  /** OAuth redirect URI */
  redirectUri?: string;
  /** OAuth client ID */
  clientId?: string;

  /** Called when verification succeeds */
  onSuccess?: (detail: SuccessDetail) => void;
  /** Called when verification fails */
  onError?: (detail: ErrorDetail) => void;
  /** Called when verification step changes */
  onStatus?: (detail: StatusDetail) => void;
  /** Called when a cached verified session is found */
  onAlreadyVerified?: (detail: AlreadyVerifiedDetail) => void;

  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: CSSProperties;
}
