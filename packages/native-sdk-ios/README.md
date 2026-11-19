# native-sdk-ios

The iOS native core of the Self SDK, in plain Swift. It hosts one web view that runs the Self web app and answers the web app's bridge messages with device features.

**Status: bridge types only.** The package holds the types of the bridge contract and their tests. No feature code exists yet.

## Rules for this directory

- New iOS native code for the SDK goes here.
- The existing implementations are reference only. Read them to learn behaviour, or copy a reviewed piece file by file. Do not move or edit them: `packages/native-shell-ios`, `packages/self-sdk-swift`, `packages/kmp-sdk`, `packages/rn-sdk`, `packages/mobile-sdk-alpha`, `app/ios`.
- Passport NFC and MRZ source does not go in this repository. It is consumed as a published binary.
- Native code does hardware and OS access only. Screens and flow logic live in the web app.
- `Sources/SelfSdk/Bridge/Generated/` is written by `packages/bridge-schema`. Do not edit a file there and do not add one. Change the schema, then run `pnpm --filter @selfxyz/bridge-schema generate`.
- The bridge types are internal. They are not part of the host API.
- The package and product name `SelfSdk` is a placeholder until the public host API is settled.

## Requirements

- iOS 15.4 or later.
- Swift tools 5.9 or later.

## Build and test

```sh
swift build
swift test
```

The package was created with `swift package init --type library`.
