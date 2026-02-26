# Components

## Design System: Euclid

**Euclid** (`@selfxyz/euclid`) is the canonical component library. All new UI should pull from Euclid first.

| Package | Platform | Usage |
|---------|----------|-------|
| `@selfxyz/euclid` | React Native | App and mobile-sdk-alpha |
| `@selfxyz/euclid-core` | Shared | Design tokens, types |
| `@selfxyz/euclid-web` | Browser/WebView | webview-app |

Euclid provides screen-level components (CountryPickerScreen, RecoveryPhraseScreen, HomeScreen, etc.), icons, colors, and shared UI patterns.

## Component Architecture

```
@selfxyz/euclid(-web/-core)     ← Design system (source of truth)
    │
    ▼
mobile-sdk-alpha/src/flows/     ← SDK flow screens (wrap Euclid)
    │
    ▼
app/src/screens/                ← App screens (consume SDK or Euclid directly)
    │
    ▼
app/src/components/             ← App-specific components (only if not in Euclid)
```

## Component Patterns

- **Functional components** with TypeScript interfaces for props
- **Tamagui primitives** as base building blocks: `XStack`, `YStack`, `View`, `Text`
- **Feature-based organization**: Group components by domain (homescreen, navbar, documents, etc.)
- **Provider nesting**: 12-deep provider tree wrapping the navigation root

## State Management in Components

| Pattern | When to Use |
|---------|-------------|
| Zustand stores | Global app state (user, settings, proof history) |
| XState machines | Complex workflows (proving, onboarding) |
| React Context | Service injection (auth, database, SDK client) |
| Local useState | Component-specific UI state |

## Hook Patterns

- 29+ custom hooks in `app/src/hooks/`
- Complex flows use a **callback registry** pattern for navigation with state
- Responsive hooks: `useCardDimensions()`, `useWindowDimensions()`
- Platform hooks: `useAppUpdates()` (native) / `useAppUpdates.web.ts` (web stub)

## DOs

- DO use Euclid components before creating custom ones
- DO import colors and icons from Euclid (or from `mobile-sdk-alpha/constants/colors`)
- DO use functional components with TypeScript prop interfaces
- DO separate business logic into hooks; keep components focused on rendering
- DO use the provider pattern for cross-cutting concerns
- DO use Tamagui primitives (XStack, YStack, Text) as layout building blocks

## DON'Ts

- DON'T create new components that duplicate Euclid screens or patterns
- DON'T put business logic directly in component bodies — extract to hooks
- DON'T use class components
- DON'T hardcode colors — use Euclid tokens or SDK color constants
- DON'T create deeply nested prop drilling — use context providers or Zustand
- DON'T import from Euclid dist paths directly (e.g., `@selfxyz/euclid/dist/...`) unless the component isn't re-exported at the package root
