# bridge-schema

The single source of the bridge contract between the Self web app and the native SDK cores: the message schema, the types generated from it for TypeScript, Swift and Kotlin, and the shared test fixtures that all three implementations must pass.

**Status: envelope only.** The package holds the schema of the four message kinds, the error object and the core domain list, with the `envelope` and `envelope-invalid` fixture groups. It holds no method, handshake or storage schema and no generation target yet.

## Schema

Source: Bridge Contract (BC) sections 4.1 to 4.5, 7.1 to 7.3 and 8. Decision ids: BC-Q8, BC-Q10, BC-Q33, BC-Q40.

| `$id`               | Holds                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `bridge/request`    | Request, web to native.                                                                              |
| `bridge/response`   | Response, native to web. `error` is required when `success` is `false` and absent when it is `true`. |
| `bridge/event`      | Event, native to web. `requestId` is present when a request caused the event.                        |
| `bridge/cancel`     | Cancel, web to native.                                                                               |
| `bridge/error`      | The error object: the code, the `details.reason` values each code allows, the typed `details` keys.  |
| `bridge/error-code` | The eleven error codes.                                                                              |
| `bridge/domain`     | The eight core domains.                                                                              |
| `bridge/common`     | The `id`, `version`, `domain` and `timestamp` fields.                                                |

What the schema does and does not enforce:

- An unknown field is valid at every level. An optional field can be `null` or absent. A required field cannot be `null`.
- `version` is any integer from 1. A message with a major the receiver does not serve is a valid message that gets `UNSUPPORTED_VERSION`.
- `domain` on a message is any non-empty string, because native answers an unknown domain with `UNSUPPORTED` and copies the name into the response. Check the name against `bridge/domain` to route.
- `method`, `params`, `data` and event names are not checked per domain yet.
- `details.reason` is checked against the list of its code. A code with no list takes no reason.
- Rules about behaviour are not in the schema: string bodies only, delivery in order, no event after the response, one response per request.

## Fixtures

One file per fixture, at `fixtures/<group>/<case>.json`, in the shape of BC 11.1: `{ name, given, steps }`. `tests/fixtures.test.ts` validates every message of every fixture. The loader and the runner rules are not written yet, so these parts of the shape are provisional:

| Part                                              | Meaning                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `send` that is a string                           | The raw message body, for input that is not a JSON object.                                    |
| `{ "native": "system_back" }`                     | A step that native starts with no message from the web.                                       |
| `given.provider`: `pending`, `progress`, `fail`   | The fake hardware never finishes, emits these progress events, or fails with the named cause. |
| An unknown field or a `null` field in an `expect` | Input for the web runner. A native runner must not require native to emit it.                 |

In `envelope-invalid`, a `send` can fail the schema, and some input is invalid for a reason the schema cannot see (unknown domain, unknown method, duplicate request id). `SEND_PROBLEMS` in `tests/fixtures.test.ts` states which. Every `expect` in that group is valid.

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

Define the fixture format and its TypeScript loader: `{ name, given, steps }`, id labels and fake-clock steps (BC 11.1).
