# bridge-schema

The single source of the bridge contract between the Self web app and the native SDK cores: the message schema, the types generated from it for TypeScript, Swift and Kotlin, and the shared test fixtures that all three implementations must pass.

**Status: tooling only.** The package has the directory layout, a JSON Schema validator, the generation entry point and tests for them. It holds no schema, no fixture and no generation target yet.

## Layout

| Path                  | Holds                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `schema/`             | The contract as JSON Schema files. Each file declares the 2020-12 dialect and a unique `$id`.  |
| `fixtures/`           | The shared conformance fixtures, as JSON.                                                      |
| `src/index.ts`        | The `.` export. No Node API and no validator, so the web bundle can import it.                 |
| `src/validator.ts`    | The `./validator` export. Compiles a set of schemas and validates a value against one of them. |
| `src/node/`           | The `./node` export. Reads `schema/` from disk and runs generation.                            |
| `scripts/generate.ts` | The generation entry point. It lists the generation targets.                                   |

The exports point at TypeScript source. The package is private and has no build step.

## Rules for this directory

- The contract is defined here once. `packages/webview-bridge`, `packages/native-sdk-ios` and `packages/native-sdk-android` consume it and do not define their own copy.
- A change to a message is made here first, with a fixture, and then in the three implementations.
- Generated files are committed. Do not edit them by hand; change the schema and run `generate`.
- The existing bridge types in `packages/webview-bridge` and `packages/kmp-sdk` are reference only until this package replaces them.

## Commands

```sh
pnpm --filter @selfxyz/bridge-schema types
pnpm --filter @selfxyz/bridge-schema test
pnpm --filter @selfxyz/bridge-schema generate        # write the generated files
pnpm --filter @selfxyz/bridge-schema generate:check  # exit 1 if a generated file is out of date
```

## Next step

Add the schema for the message envelope, the error codes and the domain list, with the `envelope` and `envelope-invalid` fixture groups.
