# native-sdk-ios

The iOS native core of the Self SDK, in plain Swift. It hosts one web view that runs the Self web app and answers the web app's bridge messages with device features.

**Status: bridge types and build setup.** The package holds the types of the bridge contract, their tests, the two targets and the lint setup that the next steps use. No feature code exists yet.

## Rules for this directory

- New iOS native code for the SDK goes here.
- The existing implementations are reference only. Read them to learn behaviour, or copy a reviewed piece file by file. Do not move or edit them: `packages/native-shell-ios`, `packages/self-sdk-swift`, `packages/kmp-sdk`, `packages/rn-sdk`, `packages/mobile-sdk-alpha`, `app/ios`.
- Passport NFC and MRZ source does not go in this repository. It is consumed as a published binary.
- Native code does hardware and OS access only. Screens and flow logic live in the web app.
- `Sources/SelfSdk/Bridge/Generated/` is written by `packages/bridge-schema`. Do not edit a file there and do not add one. Change the schema, then run `pnpm --filter @selfxyz/bridge-schema generate`.
- SwiftLint does not check that directory (`.swiftlint.yml`). The drift check of `packages/bridge-schema` owns the format of those files.
- The bridge types are internal. They are not part of the host API.
- The package, product and target names `SelfSdk` and `SelfSdkUI` are placeholders until the public host API is settled.

## Requirements

- iOS 15.4 or later.
- Swift tools 5.9 or later.

- SwiftLint, to lint. Xcode with an iOS simulator, to test the UI target.

## Targets

| Target      | Imports                  | Holds                                                        | Tested by                         |
| ----------- | ------------------------ | ------------------------------------------------------------ | --------------------------------- |
| `SelfSdk`   | Foundation only          | The bridge types and all logic that needs no screen.         | `swift test` and the simulator    |
| `SelfSdkUI` | `SelfSdk`, UIKit, WebKit | The web view host and other code that needs UIKit or WebKit. | The simulator only (`xcodebuild`) |

- Put code in `SelfSdk` unless it needs UIKit or WebKit. Its tests run in seconds with no simulator.
- `swift build` builds both targets for macOS. A UIKit import in `SelfSdk` fails that build. A WebKit or AppKit import does not, because macOS has both: no check stops one, so review must.
- Each source file of `SelfSdkUI` and of `SelfSdkUITests` is inside `#if canImport(UIKit)`. On macOS the two targets are empty, so `swift build` and `swift test` pass and run no UI test.
- `SelfSdkUI` cannot see the internal bridge types of `SelfSdk`. How it gets them is not decided. The first step that needs them in `SelfSdkUI` (the WebView host, step 16) decides.
- `ToolchainTests` in `SelfSdkUITests` proves that the UI target builds and runs on a simulator. It tests no SDK behaviour.

## Build, test and lint

```sh
swiftlint lint --strict
swift build
swift test
xcodebuild -scheme SelfSdk-Package -destination 'platform=iOS Simulator,name=iPhone 17,OS=latest' test
```

The scheme `SelfSdk-Package` runs the tests of both targets. Use the name of a simulator from `xcrun simctl list devices available`.

CI runs the four commands in `.github/workflows/native-sdk-ci.yml`.

The package was created with `swift package init --type library`.
