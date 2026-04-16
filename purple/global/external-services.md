# External Services

## Service Map

| Service | Package | Purpose | Location |
|---------|---------|---------|----------|
| Firebase Messaging | `@react-native-firebase/messaging` | Push notifications | `app/src/services/notifications/` |
| Firebase Remote Config | `@react-native-firebase/remote-config` | Feature flags, remote config | `app/src/providers/remoteConfigProvider.tsx` |
| Segment | `@segment/analytics-react-native` | Analytics / event tracking | `app/src/services/analytics.ts` |
| Sentry | `@sentry/react-native` | Error tracking / crash reporting | `app/src/config/sentry.ts` |
| Didit | `@didit-protocol/sdk-react-native` | KYC identity verification | `app/src/integrations/kyc/` |
| Google Drive | `@robinbobin/react-native-google-drive-api-wrapper` | Cloud mnemonic backup | `app/src/services/cloud-backup/google.ts` |
| Google OAuth | `react-native-app-auth` | OAuth 2.0 for Drive access | `app/src/services/cloud-backup/google.ts` |

## Integration Patterns

### Analytics (Segment)
- Centralized in `app/src/services/analytics.ts`
- Events defined as constants in `packages/mobile-sdk-alpha/src/constants/analytics.ts`
- Track via the analytics adapter (SDK) or service directly (app)

### Error Tracking (Sentry)
- Initialized early in app lifecycle
- Platform-specific configs: `sentry.ts` / `sentry.web.ts`
- Captures unhandled exceptions and breadcrumbs

### Remote Config (Firebase)
- Wrapped in `RemoteConfigProvider` context
- Provides feature flags and runtime configuration
- Fetched on app start, cached locally

### KYC (Didit)
- Access token fetched per-session via TEE endpoint
- 30-second timeout on token fetch
- Token not persisted — fresh for each KYC session

### Cloud Backup (Google Drive)
- OAuth 2.0 with offline access + consent prompt
- Scoped to Google Drive app data folder only
- Mnemonic encrypted before upload

## DOs

- DO use the centralized analytics service for event tracking
- DO define new analytics events as constants (not inline strings)
- DO handle service failures gracefully — external services are not critical path
- DO use Firebase Remote Config for feature flags (not hardcoded booleans)
- DO scope OAuth to minimum required permissions

## DON'Ts

- DON'T call external services synchronously in the critical app startup path
- DON'T persist third-party service tokens long-term — fetch fresh per session
- DON'T send sensitive identity data to analytics services
- DON'T bypass the provider pattern for service access — use context providers
- DON'T add new external service integrations without a dedicated service module
