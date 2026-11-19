# bridge-schema

The single source of the bridge contract between the Self web app and the native SDK cores: the message schema, the types generated from it for TypeScript, Swift and Kotlin, and the shared test fixtures that all three implementations must pass.

**Status: envelope, handshake, storage policy, native types and native fixture copies.** The package holds the schema of the four message kinds, the error object, the core domain list and the handshake (`lifecycle.getConfig`), the `envelope`, `envelope-invalid`, `handshake` and `version` fixture groups, the fixture format with its TypeScript loader, the storage policy table with the key-pattern list, and the generator of the Kotlin and Swift types. It holds no other method schema and no `secureStorage` method schema yet.

## Schema

Source: Bridge Contract (BC) sections 4.1 to 4.5, 5.1 to 5.4, 7.1 to 7.3 and 8. Decision ids: BC-Q8, BC-Q10, BC-Q33, BC-Q40.

The handshake also takes fields that other pages propose and BC does not show yet. They are built as drafted: Shell Contract (SC) section 4 (SC-P4), Storage and Security (SS) section 9.3, Web Delivery row WD-P14. Decision ids: BC-Q6, BC-Q7, BC-Q38, SC-P4, SC-Q7, SC-Q12, WD-P14, MG-Q2. The typed feature flags come from BC 8.2 to 8.4: BC-Q14, BC-Q20, BC-Q22.

| `$id`                       | Holds                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `bridge/request`            | Request, web to native.                                                                              |
| `bridge/response`           | Response, native to web. `error` is required when `success` is `false` and absent when it is `true`. |
| `bridge/event`              | Event, native to web. `requestId` is present when a request caused the event.                        |
| `bridge/cancel`             | Cancel, web to native.                                                                               |
| `bridge/error`              | The error object: the code, the `details.reason` values each code allows, the typed `details` keys.  |
| `bridge/error-code`         | The eleven error codes.                                                                              |
| `bridge/domain`             | The eight core domains.                                                                              |
| `bridge/common`             | The `id`, `version`, `domain` and `timestamp` fields.                                                |
| `bridge/handshake-request`  | The `params` of `lifecycle.getConfig`: `protocolMinor` and `webVersion`.                             |
| `bridge/handshake-response` | The `data` of the answer to `lifecycle.getConfig`.                                                   |
| `bridge/capability`         | The entry of one domain in the handshake's `capabilities`.                                           |
| `bridge/storage-key`        | A key name of the web namespace: 1 to 128 characters from `A-Z a-z 0-9 _ . -`.                       |
| `bridge/storage-policy`     | The shape of `storage/policy.json`. Not a bridge message.                                            |

What the schema does and does not enforce:

- An unknown field is valid at every level of a message. `bridge/storage-policy` is not a message and does not allow one. An optional field can be `null` or absent. A required field cannot be `null`.
- `version` is any integer from 1. A message with a major the receiver does not serve is a valid message that gets `UNSUPPORTED_VERSION`.
- `domain` on a message is any non-empty string, because native answers an unknown domain with `UNSUPPORTED` and copies the name into the response. Check the name against `bridge/domain` to route.
- `method`, `params`, `data` and event names are not checked per domain by the message schemas. `METHOD_SCHEMAS` names the schema of a method's `params` and of its result. It lists `lifecycle.getConfig` only.
- `details.reason` is checked against the list of its code. A code with no list takes no reason.
- Rules about behaviour are not in the schema: string bodies only, delivery in order, no event after the response, one response per request.

### Handshake

`PROTOCOL_VERSION` is major 2, minor 0. The handshake response schema enforces these rules:

- Required in both modes: the BC 5.3 fields, and `app`, `device`, `locale`, `insets`, `appState`. `verificationRequest` and `locale.region` are required and can be `null`.
- Required when `mode` is `self-app`: `migration`, `initialIntake` (can be `null`) and `pendingIntakeCount`. In `embed` they are not checked for absence.
- Optional: `storage` and `bundle`.
- `capabilities` has an entry for each of the eight core domains. An entry for another domain is valid and has the same shape, or is `null`.
- An entry with `available: false` has a `reason` and no methods.
- Typed feature flags: `secureStorage.userPresence`, `nfc.can`, `camera.hints`. Other flags are not checked. `camera.previewModes` waits for BC-Q1.

The schema does not check these:

- The fields of `verificationRequest`. Native copies the host's request and the web validates it (BC 9.2). The extra fields are not determined (BC-Q24).
- The fields of `initialIntake`. The intake object is SC 5.2, which waits for SC-Q1.
- The value of `migration.status`. The web treats an unknown status as not final (SC 10.1).

## Fixtures

Source: BC 11.1 and 11.2. BC 11.1 is marked Proposed and is built as drafted.

One file per fixture, at `fixtures/<group>/<case>.json`:

```json
{
  "name": "<group>/<case>",
  "given": {
    "capabilities": "full",
    "provider": { "nfc.scanPassport": { "fail": "nfc_disabled" } },
    "launch": { "mode": "embed", "verificationRequest": null }
  },
  "steps": [{ "send": {} }, { "advance": 2000 }, { "expect": {} }]
}
```

The Swift and Kotlin runners must read a file by the same rules as the TypeScript loader. The loader rejects a file that breaks one of them.

| Part                 | Rule                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| The file             | A JSON object with the keys `name`, `given` and `steps` and no other key.                                    |
| `name`               | Equal to the file path under `fixtures/`, without `.json`.                                                   |
| `given.capabilities` | Required. A named device setup, for example `full`. See the list below.                                      |
| `given.provider`     | Optional. What the fake hardware does, keyed by `<domain>.<method>`.                                         |
| `given.launch`       | Optional. An object: what the fake host and device give native for this launch. `given` takes no other key.  |
| `steps`              | A list of one or more steps. A step is an object with exactly one of the four keys below.                    |
| `send`               | A message from web to native: a JSON object.                                                                 |
| `expect`             | A message from native to web: a JSON object.                                                                 |
| `advance`            | The runner moves its fake clock forward by this many milliseconds: an integer, 1 or more.                    |
| `native`             | A non-empty string that names an action native starts with no message from the web. See the additions below. |

The loader does not check the messages inside `send` and `expect`. `tests/fixtures.test.ts` validates them against the schema.

Placeholders (`fillPlaceholders`):

- A string `id` or `requestId` on a `send` object, and a string `requestId` on an `expect`, is a label such as `r1`. A runner replaces it with a real id, the same id wherever the fixture uses the label. A native runner makes a UUID for each label (`createLabelBinder`). The web runner binds the label to the id the bridge made.
- A label can appear on more than one request, and a `requestId` can name a label that no request has. Both are fixture input.
- `"timestamp": 0` on a `send` object is replaced with the time of the send.
- A runner adds no field to a `send` and does not change a field of another type. Invalid input stays invalid.
- An `expect` leaves out the message's own `id` and `timestamp`, and `error.message`. No runner compares them. `completeExpect` adds them before a message is validated or fed to the web bridge.

Launch setup (`given.launch`). BC 11.1 does not define it. It is this package's addition:

- It holds the handshake response fields that native reads from the host app, the device and its own build: every field other than `protocolVersion`, `protocolMinor` and `capabilities`. The loader rejects those three keys and does not inspect the others.
- A runner sets up its fake host and device from it. Native then answers `lifecycle.getConfig` with `PROTOCOL_VERSION`, these fields unchanged, and the capability entries of `given.capabilities`. This includes `sdkVersion` and `platform`, so one fixture runs on both platforms.
- A fixture that expects a successful handshake must have it. Without it, the answer to `lifecycle.getConfig` is not defined.

Capability setups (`given.capabilities`). The handshake fixture of a name defines its entries:

| Name                   | Entries                                                             | Defined by                       |
| ---------------------- | ------------------------------------------------------------------- | -------------------------------- |
| `full`                 | Every core domain is available.                                     | `handshake/full`                 |
| `no_passport_module`   | `full`, with `nfc` and `camera` not available, reason `no_module`.  | `handshake/no-passport-module`   |
| `no_nfc_hardware`      | `full`, with `nfc` not available, reason `no_hardware`.             | `handshake/no-nfc-hardware`      |
| `no_device_credential` | `full`, with `secureStorage.features.userPresence` equal to `none`. | `handshake/no-device-credential` |

In `self-app` mode the `lifecycle` entry has no `setResult` method and no `cancel` event (SC 4). `handshake/self-app` defines `full` for that mode. It lists the eight core domains only: the shell domains of SC 4 are not in the contract yet.

In the `version` group, native answers a request at a major it does not serve with `UNSUPPORTED_VERSION` and `details.supported`, and accepts `lifecycle.dismiss`. Each response carries native's own major in `version`.

Time:

- A runner uses a fake clock. No fixture waits in real time.
- The clock moves only at an `advance` step. Timers that end inside the step fire before the next step starts.

The format does not define these yet:

- How the web runner compares a message with an `expect`. There is no matcher in this package. The native rule is below.
- The `given.provider` key for "succeed with a value".
- The list of `native` actions.

### How a native runner compares

BC 11.1 says a runner compares the listed fields and ignores the message's own `id`, its `timestamp` and `error.message`. It does not say more. The Kotlin and Swift runners (`FixtureMatcher`) apply these rules:

- Only the fields of the contract are compared. Response: `type`, `version`, `domain`, `requestId`, `success`, `data`, `error`. Event: `type`, `version`, `domain`, `event`, `requestId`, `data`. Another field in an `expect` is input for the web runner.
- A field the `expect` does not list is not compared.
- `null` in an `expect` means native emits no value: the field is absent or `null`.
- `data` must be equal as a whole.
- Of `error`: the `code`, and each key that the `expect` lists in `details`. Native can emit more keys in `details`.
- Native must emit each `expect` in order and no other message.

A fixture ends as passed, failed or deferred. Deferred means the code under test cannot run a step yet. It is not a pass.

### Additions to BC 11.1

BC 11.1 has no raw body and no native step, and it names the provider behaviours "emit progress" and "never finish" without a key for them. These four parts are this package's additions to the format. The owner accepted them. The loader accepts all four.

| Part                                              | Meaning                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send` that is a string                           | The raw message body, for input that is not a JSON object.                                                                                                                                       |
| `{ "native": "system_back" }`                     | A step that native starts with no message from the web.                                                                                                                                          |
| `given.provider`: `pending`, `progress`           | The fake hardware never finishes (`true`), or emits these progress events (a list of objects). `fail`, a named cause, is in BC 11.1. An entry takes no other key, and not `pending` with `fail`. |
| An unknown field or a `null` field in an `expect` | Input for the web runner. A native runner must not require native to emit it.                                                                                                                    |

In `envelope-invalid`, a `send` can fail the schema, and some input is invalid for a reason the schema cannot see (unknown domain, unknown method, duplicate request id). `SEND_PROBLEMS` in `tests/fixtures.test.ts` states which. Every `expect` in that group is valid.

## Storage policy

Source: Storage and Security (SS) sections 5.2, 6.3 and 6.4, and SS 11.2 for the document id. All are marked Proposed and are built as drafted. Decision ids: SS-S5.2, SS-S6.3, MG-Q1 (draft (a): the keys are the web's keys), MG-Q3 (draft (a): the marker is the native item `migration.state`).

`storage/policy.json` is the policy table. The web's storage adapter takes its key-pattern list from it. Each native library has the rows as generated constants (`StoragePolicyTable`, see Native types), and `generate:check` fails when they differ from this file. No list is written by hand a second time. SS 6.3 says that both native libraries load the same file: the constants replace a file read at start, because SwiftPM cannot read outside its package root.

```json
{
  "version": 1,
  "rows": [
    {
      "item": "Recovery phrase",
      "namespace": "web",
      "pattern": "self_mnemonic",
      "minimumProtection": "userPresence"
    },
    {
      "item": "Private key. Never stored.",
      "namespace": "web",
      "pattern": "self_private_key",
      "forbidden": true
    }
  ]
}
```

| Part                | Rule                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| The file            | Has the shape of `bridge/storage-policy`. An unknown field is not valid. A reader rejects a `version` other than 1. |
| `namespace`         | `web` or `native` (SS 5.1).                                                                                         |
| `pattern`           | A regular expression that must match the whole key. See the pattern rules below.                                    |
| `minimumProtection` | `none` or `userPresence`: the lowest class the storage layer stores a matching key at.                              |
| `forbidden`         | `true`: the storage layer refuses a matching key. A row has `minimumProtection` or `forbidden`, not both.           |
| `item`              | Optional text for readers of the file.                                                                              |

How a reader applies the table (`createStoragePolicy`, `resolve`):

1. Check the key. A web key must pass `bridge/storage-key`. A native key has the same characters and no length limit. A key that fails is `invalid`, and no row is tried.
2. Take the first row of the key's namespace whose pattern matches the whole key.
3. A forbidden row: `forbidden`. Another row: `matched`, with the row's minimum class. No row: `unmatched`, with the class `none` (BC 8.2).

The three results are different on purpose. Native stores a web key that no row matches, at the class `none`, because native cannot tell whether a key holds personal data. The web's storage adapter does not: `isAllowedWebKey` accepts a key only when a web row that is not forbidden matches it. `webKeyPatterns` is that key-pattern list.

Pattern rules. JavaScript, `java.util.regex` and `NSRegularExpression` must give the same answer, so a pattern has three parts only:

- A literal character from `A-Z a-z 0-9 _ -`.
- An escaped dot, `\.`.
- A character class of those characters and the dot, with an optional `{n}` or `{n,m}` count.

A pattern has no anchor. A reader matches the whole key (`matches()` in Kotlin, a match of the full range in Swift) and does not search inside it. The key check of step 1 runs first, so a key with a line break never reaches a pattern.

The rows (SS 6.4):

| Namespace | Pattern                                   | Class or mark  | Item                                            |
| --------- | ----------------------------------------- | -------------- | ----------------------------------------------- |
| `web`     | `self_mnemonic`                           | `userPresence` | Recovery phrase. The only row above `none`.     |
| `web`     | `self_private_key`                        | forbidden      | Private key. Never stored.                      |
| `web`     | `self_identity_address`                   | `none`         | Identity address.                               |
| `web`     | `self_backup_state`                       | `none`         | Backup state.                                   |
| `web`     | `self_document_catalog`                   | `none`         | Document catalog.                               |
| `web`     | `self_doc_[0-9a-f]{64}`                   | `none`         | Document. The id is the content hash (SS 11.2). |
| `web`     | `self_migration_legacy_[1-4]`             | `none`         | Staged legacy document (MG 4.3).                |
| `web`     | `self_setting_[a-z0-9_]{1,64}`            | `none`         | Setting.                                        |
| `native`  | `migration\.state`                        | `none`         | Migration state marker.                         |
| `native`  | `presence\.web\.[A-Za-z0-9_.-]{1,128}`    | `none`         | Presence record of a web item. iOS only.        |
| `native`  | `presence\.native\.[A-Za-z0-9_.-]{1,128}` | `none`         | Presence record of a native item. iOS only.     |
| `native`  | `storage\.meta`                           | `none`         | Storage metadata.                               |
| `native`  | `cloud\.google\.tokens`                   | `none`         | Google sign-in tokens. Android only.            |

The spec does not determine these. Each has the default that the table or the code uses:

- The characters and length of `<name>` in `self_setting_<name>`. Default: 1 to 64 characters from `a-z 0-9 _`.
- Whether the 128 character limit of SS 5.2 covers the native namespace. `presence.<namespace>.<key>` is longer than 128 characters for a long key. Default: the limit covers web keys only.
- The error native gives for a forbidden key. SS 6.4 says native refuses the name and names no code. The table holds no error. Step 25 needs the answer.
- A push token, pending KYC sessions and points events (SS 6.4, "Not determined"). They have no row.
- The debug key `self_keychain_debug` of the web's debug screens. It has no row, so the web's key check does not allow it.

Not in this package yet: the `secureStorage` method schemas, the value size limit (SS 5.3), and the rules that need the stored item (a `set` below the minimum class, a `set` that lowers a class). Those belong to the storage core.

## Native types

Source: plan 3.4-1 option (a) and 3.4-2 option (b). The generator is in this package. Its output is committed inside each native package, because SwiftPM cannot read a file outside its package root.

| Target | Directory                                                                         | Visibility |
| ------ | --------------------------------------------------------------------------------- | ---------- |
| Kotlin | `packages/native-sdk-android/src/main/kotlin/xyz/self/sdk/core/bridge/generated/` | `internal` |
| Swift  | `packages/native-sdk-ios/Sources/SelfSdk/Bridge/Generated/`                       | internal   |

Each target writes the same six files:

| File                 | Holds                                                                                                        | Read from                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `BridgeEnvelope`     | The four messages, the message type list, the core domain list, the cancel reasons.                          | `schema/`                              |
| `BridgeError`        | The error object, its details, the eleven codes, the three reason lists, and `allowedReasons` of a code.     | `schema/error.json`, `error-code.json` |
| `BridgeHandshake`    | The handshake request and response, the capability entry, and the enum of each typed field and feature flag. | `schema/`                              |
| `BridgeStorage`      | The storage namespaces and the protection classes.                                                           | `schema/storage-policy.json`           |
| `BridgeProtocol`     | The protocol major and minor.                                                                                | `PROTOCOL_VERSION`                     |
| `StoragePolicyTable` | The rows of the policy table as constants, the table version, the key length limit and the default class.    | `storage/policy.json`, `src/`          |

How a schema becomes a type:

- `src/node/native/plan.ts` gives each type its name and the place in the schema it is read from. JSON Schema has no name for an inline enum or object. The values of an enum, the fields of a type, and which fields can be `null` come from the schema.
- An enum holds the wire value of each case: `wire` and `fromWire` in Kotlin, `rawValue` in Swift. In Swift the wire value `none` is the case `noneValue`, because `.none` on an optional means "no value".
- A field that the schema does not require is nullable and has the default `null`. A field that is required and can be `null` is nullable and has no default. `null` and absent are the same.
- An `integer` is `Long` in Kotlin and `Int` in Swift. A `number` is `Double`.
- A property with a `const` is not a field. The `type` of a message is the type itself, and `BridgeMessageType` lists the four values.
- `domain`, `method`, `event`, `details.reason` and `migration.status` are strings, as in the schema. Use `BridgeDomain` to route and `allowedReasons` to check a reason.
- A value the schema does not type is `JsonValue` (Kotlin) or `JSONValue` (Swift), a small hand-written type in each native package: `params`, `data`, `verificationRequest`, `initialIntake`, `features`.
- `capabilities` is a map from a domain name to an entry that can be `null`. The typed feature flags have an enum each (`BridgeUserPresence`, `BridgeCameraHint`), and `features` stays an untyped object.
- A rule of the schema that is not a type is not in the types: `if`, `then`, `else`, `pattern`, `minimum`, the lengths.

The generator stops with an error, and names the place in the schema, for each of these:

- A keyword it does not read.
- An inline enum or an object with named fields that the plan does not name.
- A schema enum that no type is made from.
- A code with a reason list in `bridge/error` that the plan does not list, or lists with another enum.
- Two wire values of one enum that give the same native name.
- A policy table that `createStoragePolicy` refuses.

Drift check. `generate:check` exits 1, and names the file, when a generated file differs from the generator's output, when one is missing, and when a generated directory holds a file the generator does not write. `generate` writes the files and removes such a file. A file whose name starts with a dot is ignored. `tests/nativeTypes.test.ts` runs the same check, so `test` also fails on drift. The `bridge-schema` job of `.github/workflows/native-sdk-ci.yml` runs `types`, `test` and `generate:check`.

Not in the types yet:

- A parser and a writer. The types hold values only. Each native package has a hand-written codec next to the generated directory (`EnvelopeCodec`). It reads and writes `JsonValue` / `JSONValue` and does not use kotlinx-serialization. A number in that type is a double, as in `JSON.parse`.
- The keys of `details` that the schema does not list, for example `nativeCode` and `cause`.
- The rules that apply the policy table (`resolve` in `src/storagePolicy.ts`). Native has the rows only. The storage core applies them.
- TypeScript types of the messages. The web bridge takes them in step 12.

### Fixture copies

`generate` also copies every fixture file into each native package, byte for byte, with the `<group>/<case>.json` layout. SwiftPM takes test resources from inside its package only, so a native test cannot read `fixtures/` here.

| Target | Directory                                                         |
| ------ | ----------------------------------------------------------------- |
| Kotlin | `packages/native-sdk-android/src/test/resources/bridge-fixtures/` |
| Swift  | `packages/native-sdk-ios/Tests/SelfSdkTests/Fixtures/`            |

The drift check covers the copies in the same way as the types: a copy that differs, is missing, or has no source fails `generate:check`, and `tests/nativeFixtures.test.ts` runs the same check. Edit a fixture here and run `generate`.

## Layout

| Path                   | Holds                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `schema/`              | The contract as JSON Schema files. Each file declares the 2020-12 dialect and a unique `$id`.  |
| `fixtures/`            | The shared conformance fixtures, as JSON.                                                      |
| `storage/policy.json`  | The storage policy table. The `./storage/*` export.                                            |
| `src/storagePolicy.ts` | The table types, `isValidStorageKey` and `createStoragePolicy`. Part of the `.` export.        |
| `src/index.ts`         | The `.` export. No Node API and no validator, so the web bundle can import it.                 |
| `src/fixture.ts`       | The fixture types, `parseFixture` and the placeholder functions. Part of the `.` export.       |
| `src/validator.ts`     | The `./validator` export. Compiles a set of schemas and validates a value against one of them. |
| `src/node/`            | The `./node` export. Reads `schema/` and `fixtures/` from disk and runs generation.            |
| `src/node/native/`     | The Kotlin and Swift targets: the plan, the schema reader, one emitter per language, the copy. |
| `scripts/generate.ts`  | The generation entry point. It lists the generation targets.                                   |

The exports point at TypeScript source. The package is private and has no build step.

## Rules for this directory

- The contract is defined here once. `packages/webview-bridge`, `packages/native-sdk-ios` and `packages/native-sdk-android` consume it and do not define their own copy.
- A change to a message is made here first, with a fixture, and then in the three implementations.
- Generated files and fixture copies are committed. Do not edit them by hand; change the schema or the fixture and run `generate`.
- A generated directory holds generated files only. Hand-written native code goes next to it, not in it.
- ktlint and SwiftLint do not check a generated directory. `generate:check` owns the format of those files.
- The existing bridge types in `packages/webview-bridge` and `packages/kmp-sdk` are reference only until this package replaces them.

## Commands

```sh
pnpm --filter @selfxyz/bridge-schema types
pnpm --filter @selfxyz/bridge-schema test
pnpm --filter @selfxyz/bridge-schema generate        # write the generated files
pnpm --filter @selfxyz/bridge-schema generate:check  # exit 1 if a generated file is out of date
```

## Next step

The router in each native package (step 9). It implements the `FixtureSubject` of the native fixture runner, so the fixtures that are deferred today run to the end.
