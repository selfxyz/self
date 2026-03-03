# Styling

## Styling Hierarchy

Use the highest-priority approach that fits:

```
1. Euclid components        ← Preferred: pre-styled, standardized
2. Tamagui inline props     ← Atomic styles on primitives
3. Tamagui styled()         ← Reusable styled components
4. StyleSheet.create        ← Platform-specific or complex styles
```

## Tamagui Configuration

Config: `app/tamagui.config.ts`

### Fonts

| Token | Font | Usage |
|-------|------|-------|
| `advercase` | Advercase-Regular | Display headlines |
| `dinot` | DINOT-Medium | Body text, UI labels |
| `plexMono` | IBMPlexMono-Regular | Code, technical content |

Import via: `import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts'`

### Font Sizes (Tamagui tokens)

```
1: 12  2: 14  3: 15  4: 16  5: 18  6: 20
7: 24  8: 28  9: 32  10: 40  11: 52  12: 62
```

## Colors

Import from SDK constants:
```
import { black, white, cyan300, slate400, zinc900 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
```

Or from Euclid: `import { colors } from '@selfxyz/euclid-web'`

## Shadows (Cross-Platform)

```
shadowColor={black}
shadowOffset={{ width: 0, height: 4 }}
shadowOpacity={0.2}
shadowRadius={12}
elevation={8}          // Android shadow equivalent
```

## Animations

| Library | Usage |
|---------|-------|
| Lottie (`lottie-react-native`) | Complex animations, loading states |
| Tamagui animations (`@tamagui/animations-react-native`) | Transitions, micro-interactions |

Use the SDK's `LottieAnimation` wrapper for Lottie animations.

## DOs

- DO use Euclid/SDK color constants — never hardcode hex values
- DO use Tamagui font tokens (advercase, dinot, plexMono) — never raw font family strings
- DO use Tamagui inline props for simple atomic styles (padding, gap, flex)
- DO use `styled()` for components reused in multiple places
- DO use `StyleSheet.create` only when Tamagui can't express the style (complex shadows, platform quirks)
- DO use Lottie via `LottieAnimation` for loading and success animations

## DON'Ts

- DON'T mix styling approaches unnecessarily in a single component
- DON'T use raw hex colors — use named constants
- DON'T use React Native Animated API directly — use Tamagui animations or Lottie
- DON'T create global stylesheet files — keep styles co-located with components
- DON'T override Euclid component styles unless absolutely necessary
