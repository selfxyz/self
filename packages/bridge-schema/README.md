# bridge-schema

The single source of the bridge contract between the Self web app and the native SDK cores: the message schema, the types generated from it for TypeScript, Swift and Kotlin, and the shared test fixtures that all three implementations must pass.

**Status: placeholder.** This directory holds only this file. It has no `package.json` yet, so it is not part of the pnpm workspace.

## Rules for this directory

- The contract is defined here once. `packages/webview-bridge`, `packages/native-sdk-ios` and `packages/native-sdk-android` consume it and do not define their own copy.
- A change to a message is made here first, with a fixture, and then in the three implementations.
- The existing bridge types in `packages/webview-bridge` and `packages/kmp-sdk` are reference only until this package replaces them.

## Next step

Add the package manifest, the schema and the first fixtures, and update the lockfile in the same change.
