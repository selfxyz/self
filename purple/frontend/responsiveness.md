# Responsiveness

## Platform Targets

| Platform | Build | Rendering |
|----------|-------|-----------|
| iOS | React Native (Metro) | Native views |
| Android | React Native (Metro) | Native views |
| Web | Vite (React Native Web) | DOM |
| WebView | Vite (embedded) | DOM inside native shell |

## Platform-Specific Files

Use React Native's platform extension system for divergent implementations:

```
component.tsx           ← Default (shared)
component.web.tsx       ← Web override
component.native.tsx    ← Native override (iOS + Android)
component.ios.tsx       ← iOS-only override
component.android.tsx   ← Android-only override
```

Existing platform-specific files:
- `authProvider.tsx` / `authProvider.web.tsx` — Auth (keychain vs stub)
- `database.ts` / `database.web.ts` — SQLite vs stub
- `sentry.ts` / `sentry.web.ts` — Error tracking config
- `useAppUpdates.ts` / `useAppUpdates.web.ts` — Update checking
- `SvgXmlWrapper.native.tsx` / `SvgXmlWrapper.web.tsx` — SVG rendering

## Responsive Layout

### Safe Areas
```
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { top, bottom } = useSafeAreaInsets();
// Apply as padding: paddingBottom={bottom + extraPadding}
```

### Responsive Sizing
```
import { useWindowDimensions } from 'react-native';
const { width, height } = useWindowDimensions();
const scale = measuredWidth / FIGMA_REFERENCE_WIDTH;
```

### Figma-Based Scaling
Components use a scale factor derived from Figma reference dimensions:
- `useCardDimensions()` — scales card sizes to screen width
- Reference: `FIGMA_CARD_WIDTH` constant as baseline

## Navigation Differences

```
Platform.OS === 'web' ? 'Home' : 'Splash'   // Web skips splash
```

## DOs

- DO use platform file extensions (`.web.ts`, `.native.tsx`) for divergent implementations
- DO use `useSafeAreaInsets()` for all edge-to-edge screens
- DO use `useWindowDimensions()` for responsive sizing calculations
- DO test on both iOS and Android — shadows, elevation, and fonts differ
- DO provide web stubs for native-only features (NFC, biometrics, keychain)
- DO use Figma-based scale factors for pixel-perfect layout

## DON'Ts

- DON'T use `Platform.select()` for large code divergences — use platform files instead
- DON'T hardcode dimensions in pixels — derive from screen width or Figma references
- DON'T assume safe area insets are zero — always account for notches and home indicators
- DON'T use web-only APIs (localStorage, window.location) without platform checks
- DON'T forget to test the web build (`yarn web`) — it shares the same codebase
