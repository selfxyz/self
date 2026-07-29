# Account Transfer Protocol (phone -> browser extension)

> Version: **v3** (2026-07-29)
> Status: implemented on `feat/browser-extension-v1`; v1 and v2 are historical
> Canonical implementation: `packages/mobile-sdk-alpha/src/utils/sas.ts` (shared by both ends), `packages/chrome-extension/src/link.ts` (receiver), `app/src/screens/dev/LinkBrowserExtensionScreen.tsx` (sender)
> Context: [PRD](../SPEC-PRD.html), [engineering spec](../SPEC-PRODUCTION.html) (link channel authentication, threat model), [spike record](../SPEC.html)

Moves a Self account (mnemonic + document catalog + documents) from the phone to a browser extension, end-to-end encrypted, over the existing websocket relayer. The relayer is untrusted: it must not be able to read the payload or substitute one.

## Trust model

| Channel | Trust | Carries |
| --- | --- | --- |
| QR (extension screen -> phone camera) | **Trusted, out-of-band.** The anchor for everything below. | Session ids, receiver public key, `linkSecret`, relay URL |
| Relayer (socket.io) | **Untrusted.** Sees everything sent through it, may drop, reorder, or inject. | Hello message, encrypted envelope, ack |
| Human (emoji comparison) | Attentive at best; assume habituation. | Confirms the channel when the QR itself was observed |

Consequence: authentication must come from the QR, not the human. v1 and v2 got this wrong (see [engineering spec](../SPEC-PRODUCTION.html) link channel authentication).

## QR contract

```json
{
  "transferSessionId": "<uuid v4>",
  "helloSessionId": "<uuid v4>",
  "receiverPublicKey": "<P-256 uncompressed public key (04||X||Y), hex>",
  "linkSecret": "<32 random bytes, base64>",
  "relay": "wss://websocket.self.xyz | wss://websocket.staging.self.xyz"
}
```

- **`helloSessionId`** is a second relayer room, required because the relayer forwards only the **first** `self_app` per session (validated on staging 2026-07-27). The pre-send handshake cannot share the transfer room.
- **`linkSecret`** never travels through the relayer. It is the proof that a sender physically scanned this code.
- **`receiverPublicKey`** is uncompressed: WebCrypto's raw P-256 import does not reliably accept compressed points; `elliptic` on the phone accepts either.
- **`relay`** is validated against a compiled-in allowlist on both ends (wss only; localhost tolerated for harnesses). A QR-declared relay is attacker-controllable input.
- The code is **single-use and expires after 5 minutes**. On expiry the extension dims the QR, offers a new code, and refuses late transfers.

## Key schedule

Both ends derive identically from the shared module, so they cannot drift.

```
sharedSecretX = ECDH_P256(sender_ephemeral_priv, receiverPublicKey).x   // 32 bytes
transcript    = "self-ext-transfer-v3" | transferSessionId | receiverPublicKey | senderPublicKey
envelopeKey   = HKDF-SHA256(ikm = sharedSecretX, salt = linkSecret, info = transcript, len = 32)
aad           = transcript
sas           = HKDF-SHA256(ikm = sharedSecretX, salt = linkSecret || "self-ext-link-sas-v3", info = transcript, len = 6)
                mapped byte-wise over a 64-emoji table
```

Why each part:

- **HKDF rather than the raw x-coordinate**: an EC point coordinate is not uniformly random, and a bare secret is bound to nothing.
- **`linkSecret` as salt**: an attacker in relayer position knows both public keys and the session ids but not `linkSecret`, so the key they derive cannot authenticate. This is the protocol's authentication, replacing the human check.
- **transcript as `info` and as GCM `aad`**: swapping the sender key or session id fails the tag instead of decrypting into a different account.
- **6 emojis (36 bits)**: enough for a human comparison that now only has to cover the observed-QR case. Table order and labels are protocol-frozen; entries may only be appended under a new label version.

## Message flow

```
extension                              phone
  |-- QR (out of band) ------------------>|
  |                                       | validate QR (linkSecret present, relay allowlisted)
  |                                       | generate ephemeral keypair, derive sharedSecretX
  |<-- hello  {senderPublicKey} ----------|   room: helloSessionId
  | pin senderPublicKey                   |
  | show SAS                              | show SAS
  |          [user compares, presses "Encrypt & send my account"]
  |<-- self_app {envelope} ---------------|   room: transferSessionId
  | verify sender key == pinned key       |
  | decrypt (AEAD), validate payload      |
  |-- proof_verified (ack) -------------->|   room: transferSessionId
```

Wire message (both hello and transfer ride the `self_app` event, the only relayer event that carries payloads):

```json
{
  "sessionId": "<matching room id>",
  "transferType": "self-account-transfer-hello | self-account-transfer",
  "senderPublicKey": "<hex>",
  "envelope": { "nonce": "<b64, 12 bytes>", "cipherText": "<b64>", "authTag": "<b64, 16 bytes>" }
}
```

`envelope` is present only on `self-account-transfer`. Plaintext is `{version, mnemonic, documentCatalog, documents}`.

## Receiver rules (fail closed)

1. **Ignore** messages whose `sessionId` does not match the room, or whose `transferType` is unknown.
2. **Pin** the hello's `senderPublicKey`. A second hello with a *different* key marks the session conflicted and refuses everything after it: someone else is talking to this code.
3. **Refuse** a transfer that arrives with no hello, or whose `senderPublicKey` differs from the pinned one.
4. **Latch only after success.** `handled` is set after decrypt *and* payload validation, so a junk first message cannot burn the session (it used to: a single garbage frame denied the transfer).
5. **Validate shape**: every catalog entry must have a matching document; unknown envelope versions are rejected rather than best-effort parsed.
6. **Refuse after expiry**, with an explanation and a regenerate affordance.
7. **Never re-key an existing vault**: import into an initialized browser requires an explicit reset first.

## Failure signaling

Both devices must land in a matching terminal state; one-side-success is a bug class, not an edge case.

| Failure | Receiver | Sender |
| --- | --- | --- |
| Decrypt or validation fails | status line + `proof_generation_failed` nack with `TRANSFER_DECRYPT_FAILED` | "Extension rejected the transfer" + reason, retry available |
| Sender key mismatch / no hello / conflict | status line naming the cause, session refused | times out at 60s (no ack), retry available |
| Code expired | QR dimmed, "Get a new code" | times out, or fails fast on a rescan |
| Relay unreachable, drops, or rejects the join | actionable status + regenerate | actionable status; mid-send drop surfaces rather than hiding behind the spinner |
| Payload over the 512KB cap | not reached | sender-side guard with the measured size |
| User leaves the phone screen | times out | unmount cancels sockets, timer, and the pending payload |

Retry is always "scan a fresh code", never "resend into the same session": session ids are single-use.

## Size cap

Measured on staging (v1, unchanged since):

| Plaintext | On-wire | Result |
| --- | --- | --- |
| 120KB | 164KB | delivered |
| 400KB | 547KB | delivered |
| 800KB | 1.09MB | delivered only after a visible reconnect |

**512KB on-wire cap.** A realistic account (mnemonic + catalog + a few documents) is 100-200KB. Above the cap the sender fails with a clear error rather than chunking.

## Relayer facts this protocol depends on

Validated against staging; the first two are why the design looks the way it does.

- Custom event names are **not** forwarded. Only the existing vocabulary relays, hence `self_app` for both message types.
- Only the **first** `self_app` per session is forwarded, hence the separate hello room.
- `mobile_status` presence (`mobile_connected`) expires shortly after the mobile client joins and is **not** re-sent to a later-joining web client, so the sender emits on `connect` instead of waiting for presence.
- Room forwarding and the `proof_verified` ack are not TTL'd (validated after 5 minutes idle).

self-infra PR #166 fixes the presence and ordering issues server-side. Once deployed, the hello room can collapse into the transfer room (CEP-01): keep `helloSessionId` in the QR for one release for compatibility, then drop it.

## Version history

| Version | Change |
| --- | --- |
| v1 | QR + `self_app` relay validated; raw ECDH x-coordinate as the AES key; 4-emoji SAS over the bare secret |
| v2 | HKDF with the session id as salt, transcript as `info` and `aad`, SAS widened to 6 and bound to the transcript; hello key pinned; latch after decrypt |
| **v3** | `linkSecret` in the QR as HKDF salt: sender authentication becomes cryptographic, and the emoji check is demoted to covering an observed QR. Pre-v3 codes are **refused** by the phone with copy telling the user to update the extension: silent downgrade to weaker authentication is how this fix would get undone |
