# bridge-schema

The single source of the bridge contract between the Self web app and the native SDK cores: the message schema, the types generated from it for TypeScript, Swift and Kotlin, and the shared test fixtures that all three implementations must pass.

**Status: envelope only.** The package holds the schema of the four message kinds, the error object and the core domain list, the `envelope` and `envelope-invalid` fixture groups, and the fixture format with its TypeScript loader. It holds no method, handshake or storage schema and no generation target yet.

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

Source: BC 11.1 and 11.2. BC 11.1 is marked Proposed and is built as drafted.

One file per fixture, at `fixtures/<group>/<case>.json`:

```json
{
  "name": "<group>/<case>",
  "given": {
    "capabilities": "full",
    "provider": { "nfc.scanPassport": { "fail": "nfc_disabled" } }
  },
  "steps": [{ "send": {} }, { "advance": 2000 }, { "expect": {} }]
}
```

The Swift and Kotlin runners must read a file by the same rules as the TypeScript loader. The loader rejects a file that breaks one of them.

| Part                 | Rule                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| The file             | A JSON object with the keys `name`, `given` and `steps` and no other key.                                   |
| `name`               | Equal to the file path under `fixtures/`, without `.json`.                                                  |
| `given.capabilities` | Required. A named device setup, for example `full`. The names are not listed yet.                           |
| `given.provider`     | Optional. What the fake hardware does, keyed by `<domain>.<method>`. `given` takes no other key.            |
| `steps`              | A list of one or more steps. A step is an object with exactly one of the four keys below.                   |
| `send`               | A message from web to native: a JSON object.                                                                |
| `expect`             | A message from native to web: a JSON object.                                                                |
| `advance`            | The runner moves its fake clock forward by this many milliseconds: an integer, 1 or more.                   |
| `native`             | A non-empty string that names an action native starts with no message from the web. Provisional, see below. |

The loader does not check the messages inside `send` and `expect`. `tests/fixtures.test.ts` validates them against the schema.

Placeholders (`fillPlaceholders`):

- A string `id` or `requestId` on a `send` object, and a string `requestId` on an `expect`, is a label such as `r1`. A runner replaces it with a real id, the same id wherever the fixture uses the label. A native runner makes a UUID for each label (`createLabelBinder`). The web runner binds the label to the id the bridge made.
- A label can appear on more than one request, and a `requestId` can name a label that no request has. Both are fixture input.
- `"timestamp": 0` on a `send` object is replaced with the time of the send.
- A runner adds no field to a `send` and does not change a field of another type. Invalid input stays invalid.
- An `expect` leaves out the message's own `id` and `timestamp`, and `error.message`. No runner compares them. `completeExpect` adds them before a message is validated or fed to the web bridge.

Time:

- A runner uses a fake clock. No fixture waits in real time.
- The clock moves only at an `advance` step. Timers that end inside the step fire before the next step starts.

The format does not define these yet:

- How a runner compares a message with an `expect`. There is no matcher in this package.
- The `given.provider` key for "succeed with a value".
- The list of `given.capabilities` names and the list of `native` actions.

### Provisional parts

Step 2 wrote these into fixtures before the format was defined. BC 11.1 has no raw body and no native step, and it names the provider behaviours "emit progress" and "never finish" without a key for them. The loader accepts all four so that the fixtures load as they are. The owner has not confirmed them.

| Part                                              | Meaning                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send` that is a string                           | The raw message body, for input that is not a JSON object.                                                                                                                                       |
| `{ "native": "system_back" }`                     | A step that native starts with no message from the web.                                                                                                                                          |
| `given.provider`: `pending`, `progress`           | The fake hardware never finishes (`true`), or emits these progress events (a list of objects). `fail`, a named cause, is in BC 11.1. An entry takes no other key, and not `pending` with `fail`. |
| An unknown field or a `null` field in an `expect` | Input for the web runner. A native runner must not require native to emit it.                                                                                                                    |

In `envelope-invalid`, a `send` can fail the schema, and some input is invalid for a reason the schema cannot see (unknown domain, unknown method, duplicate request id). `SEND_PROBLEMS` in `tests/fixtures.test.ts` states which. Every `expect` in that group is valid.

## Layout

| Path                  | Holds                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `schema/`             | The contract as JSON Schema files. Each file declares the 2020-12 dialect and a unique `$id`.  |
| `fixtures/`           | The shared conformance fixtures, as JSON.                                                      |
| `src/index.ts`        | The `.` export. No Node API and no validator, so the web bundle can import it.                 |
| `src/fixture.ts`      | The fixture types, `parseFixture` and the placeholder functions. Part of the `.` export.       |
| `src/validator.ts`    | The `./validator` export. Compiles a set of schemas and validates a value against one of them. |
| `src/node/`           | The `./node` export. Reads `schema/` and `fixtures/` from disk and runs generation.            |
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

Define the handshake schema, with the `version` and `handshake` fixture groups (BC 5.2 to 5.4).
