# Self Demo App

This is a demo application for testing the Self mobile SDK.

## Configuration

### New Architecture

The new architecture (Fabric + TurboModules) can be toggled on/off:

**Android**: Set `newArchEnabled` in `android/gradle.properties`

- `newArchEnabled=true` - Enable new architecture
- `newArchEnabled=false` - Disable new architecture (default)

**iOS**: Set `:fabric_enabled` in `ios/Podfile`

- `:fabric_enabled => true` - Enable new architecture
- `:fabric_enabled => false` - Disable new architecture (default)

### Hermes Engine

Hermes JavaScript engine can be toggled on/off:

**Android**: Set `hermesEnabled` in `android/gradle.properties`

- `hermesEnabled=true` - Enable Hermes (default)
- `hermesEnabled=false` - Use JSC instead

**iOS**: Set `:hermes_enabled` in `ios/Podfile`

- `:hermes_enabled => true` - Enable Hermes (default)
- `:hermes_enabled => false` - Use JSC instead

## Current Settings

- **New Architecture**: Disabled
- **Hermes**: Enabled

## Build Commands

After changing configuration:

```bash
# Clean and rebuild
yarn clean

# Run on Android
yarn android

# Run on iOS
yarn ios
```
