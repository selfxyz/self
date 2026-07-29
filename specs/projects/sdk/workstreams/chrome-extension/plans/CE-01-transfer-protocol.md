# CE-01: Account Transfer Protocol (mobile -> extension)

> Status: Validated on staging 2026-07-21
> Linear: SELF-3597
> Harness: `packages/chrome-extension/harness/relayer-transfer.mjs`

## Conclusion

The existing relayer carries the transfer with **no server-side changes**, using the reverse `self_app` path:

- The **extension (receiver)** joins the relayer room as `clientType: 'mobile'` and listens for `self_app`.
- The **phone (sender)** joins the same room as `clientType: 'web'` and emits the encrypted envelope via the `self_app` event immediately on connect. It must **not** wait for `mobile_status: 'mobile_connected'`: that presence status is backed by a short-TTL session record and stops being reported to late-joining web clients within ~30s of the extension joining (found in real-device QA 2026-07-27; a receiver reconnect does not refresh it). Room forwarding of `self_app` and the `proof_verified` ack are not TTL'd (validated after 60s+ idle on staging).
- Custom event names are **not** forwarded by the relayer (verified: `account_transfer` probe never delivered). Only the existing event vocabulary relays.
- The relayer forwards only the **first** `self_app` per session (verified 2026-07-27: second emits are dropped, on the same or a fresh connection). The pre-send SAS handshake therefore uses a second room: the QR carries `helloSessionId`; the phone emits `{transferType: 'self-account-transfer-hello', senderPublicKey}` there so both sides can render the SAS emojis (`@selfxyz/mobile-sdk-alpha/utils/sas`) before the user presses Send; the encrypted envelope goes to `transferSessionId`.

Measured on `wss://websocket.staging.self.xyz`:

| Plaintext | On-wire message | Result |
| --- | --- | --- |
| 120KB | 164KB | Delivered, decrypt OK |
| 400KB | 547KB | Delivered, decrypt OK |
| 800KB | 1.09MB | Delivered after a visible reconnect/retransmit |

**Envelope cap: 512KB on the wire.** Above that the socket reconnected mid-send (socket.io server buffer limit is likely 1MB). A realistic account (mnemonic + catalog + a few documents) is 100-200KB, so chunking is out of scope; if a payload ever exceeds the cap, fail with a clear error rather than chunking (spike scope).

## QR content (extension -> phone, out of band)

```json
{
  "transferSessionId": "<uuid v4>",
  "receiverPublicKey": "<P-256 uncompressed public key (04||X||Y), hex>",
  "relay": "<relayer base URL, e.g. wss://websocket.staging.self.xyz>"
}
```

Keys travel uncompressed because WebCrypto's raw P-256 import does not reliably
accept compressed points; elliptic on the phone handles either form.

Rendered as a QR on the extension link screen plus a copyable string for emulator development. The session id is single-use; the receiver keypair is ephemeral (generated per link attempt, never persisted).

## Wire message (phone -> extension, via relayer `self_app` event)

```json
{
  "sessionId": "<transferSessionId>",
  "transferType": "self-account-transfer",
  "senderPublicKey": "<P-256 uncompressed public key (04||X||Y), hex, ephemeral>",
  "envelope": {
    "nonce": "<12 bytes, base64>",
    "cipherText": "<base64>",
    "authTag": "<16 bytes, base64>"
  }
}
```

Receivers ignore any `self_app` payload whose `transferType` is not `self-account-transfer` or whose `sessionId` does not match, so the path cannot collide with real verification sessions (distinct uuid rooms anyway).

## Cryptography

Mirrors the TEE handshake convention (`common/src/utils/proving.ts`, `provingMachine.ts`):

- ECDH on P-256; shared secret = x-coordinate as 32 bytes big-endian (`derive().toArray('be', 32)` in elliptic, `computeSecret()` in node, raw ECDH bits in WebCrypto).
- The 32-byte shared secret is used directly as the AES-256-GCM key; 12-byte random nonce; 128-bit auth tag.
- Encoding: base64 fields (not the byte-array JSON the TEE payloads use) to keep the wire size sane.
- Phone side uses `elliptic` + `node-forge` (already in the RN bundle); extension side uses WebCrypto (`ECDH` + `AES-GCM`). Interop is exercised by the harness (node crypto matches both).

## Plaintext payload (inside the envelope)

```json
{
  "version": 1,
  "mnemonic": { "phrase": "...", "password": "", "entropy": "...", "wordlist": { "locale": "en" } },
  "documentCatalog": { "documents": ["<DocumentMetadata>"], "selectedDocumentId": "<id>" },
  "documents": { "<contentHash>": "<IDDocument JSON>" }
}
```

- `mnemonic` is the keychain `secret` entry as stored (`app/src/types/mnemonic.ts` shape).
- `documents` maps each catalog entry id to the full document JSON from keychain `document-{contentHash}`.
- Receiver validates with the `DocumentCatalog` / `IDDocument` guards from `@selfxyz/common` before accepting, and derives `self_private_key` from the mnemonic the same way the app does (`m/44'/60'/0'/0/0`).

## Security notes

- End-to-end encrypted: the relayer only ever sees the envelope; the receiver private key never leaves the extension; both keypairs are ephemeral.
- The QR flows out-of-band (screen -> camera), so a relayer man-in-the-middle cannot substitute keys without also controlling the QR channel.
- No sender authentication in the spike: anyone who scans the QR could push a payload. Acceptable because the payload only ever *adds* an account chosen by the person holding the phone; flagged as a production gap.
