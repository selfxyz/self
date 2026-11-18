# bridge-schema

The single source of the bridge contract between the Self web app and the native SDK cores: the message schema, the types generated from it for TypeScript, Swift and Kotlin, and the shared test fixtures that all three implementations must pass.

**Status: empty skeleton.** The package is in the pnpm workspace as the private `@selfxyz/bridge-schema` and typechecks. It holds one placeholder constant and no schema yet.

## Rules for this directory

- The contract is defined here once. `packages/webview-bridge`, `packages/native-sdk-ios` and `packages/native-sdk-android` consume it and do not define their own copy.
- A change to a message is made here first, with a fixture, and then in the three implementations.
- The existing bridge types in `packages/webview-bridge` and `packages/kmp-sdk` are reference only until this package replaces them.

## Next step

Add the schema for the message envelope and the opening exchange, the first fixtures, and the generated types.

## Check

```sh
pnpm --filter @selfxyz/bridge-schema types
```
