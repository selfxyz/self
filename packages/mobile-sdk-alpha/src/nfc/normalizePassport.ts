// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PassportData } from '@selfxyz/common';

/**
 * Browser-safe normalizer that converts a passport NFC reader's raw JSON into
 * the provable {@link PassportData} shape.
 *
 * This mirrors the platform-specific conversions in the React Native adapter
 * (`adapters/react-native/nfc-scanner.ts` `scanIOS`/`scanAndroid`), but:
 *   - it has NO `react-native` dependency, so it is usable from the WebView
 *     browser bundle (exported via `browser.ts`); and
 *   - it is SHAPE-DRIVEN (detects which keys are present) rather than branching
 *     on host platform, because the WebView bridge reports the platform as
 *     `'react-native'` and cannot distinguish iOS from Android.
 *
 * Key correspondence (verified against the native emitters):
 *
 *   PassportData field   iOS (NfcPassportHelper)   Android (io.tradle.nfc)
 *   ------------------   -----------------------   -----------------------
 *   mrz                  mrzString                 mrz
 *   signedAttr           signedAttributes (b64)    eContent (b64)
 *   eContent             (not emitted — gap)       encapContent (b64)
 *   encryptedDigest      signature (b64)           encryptedDigest (b64)
 *   dsc                  documentSigningCertificate (PEM, both platforms)
 *   dg1Hash / dg2Hash    dataGroupHashes.DG1/DG2   dataGroupHashes["1"]/["2"]
 *
 * NOTE on the io.tradle.nfc naming inversion: on Android the native key
 * `eContent` carries the CMS *signed attributes*, and `encapContent` carries
 * the *encapsulated content* (LDSSecurityObject). PassportData uses the ICAO
 * meaning, so PassportData.eContent <- native `encapContent` and
 * PassportData.signedAttr <- native `eContent`. This inversion matches the
 * existing, proof-verified `scanAndroid` mapping.
 *
 * byte-array fields (eContent/signedAttr/encryptedDigest) are emitted as SIGNED
 * bytes in [-128, 127] to match what the proving/circuit inputs expect; DG
 * hashes are unsigned bytes in [0, 255].
 */

type Json = Record<string, unknown>;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(input: string): Uint8Array {
  // STRICT: reject any character outside the base64 alphabet. Optional '='
  // padding is allowed only at the end; whitespace is NOT silently stripped.
  // Silently discarding invalid characters (the old behavior) turned a
  // present-but-malformed field into an empty byte array that passed the
  // normalizer and only failed later during proving — a fail-open bug.
  const eqIndex = input.indexOf('=');
  const body = eqIndex === -1 ? input : input.slice(0, eqIndex);
  const padding = eqIndex === -1 ? '' : input.slice(eqIndex);
  if (!/^[A-Za-z0-9+/]*$/.test(body) || !/^={0,2}$/.test(padding)) {
    throw new Error('NFC normalization failed: invalid base64 (illegal characters)');
  }
  const clean = body;

  const lookup = new Int16Array(256).fill(-1);
  for (let i = 0; i < BASE64_ALPHABET.length; i++) {
    lookup[BASE64_ALPHABET.charCodeAt(i)] = i;
  }

  const fullGroups = Math.floor(clean.length / 4);
  const remainder = clean.length % 4;
  // A lone remainder of 1 base64 char carries only 6 bits — not enough for a
  // single byte, so it is an impossible/truncated encoding.
  if (remainder === 1) {
    throw new Error('NFC normalization failed: invalid base64 length (truncated group)');
  }
  const outLen = fullGroups * 3 + (remainder === 0 ? 0 : remainder - 1);
  const out = new Uint8Array(outLen);

  let o = 0;
  let i = 0;
  for (; i + 4 <= clean.length; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    const d = lookup[clean.charCodeAt(i + 3)];
    out[o++] = (a << 2) | (b >> 4);
    out[o++] = ((b & 15) << 4) | (c >> 2);
    out[o++] = ((c & 3) << 6) | d;
  }
  if (remainder === 2) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    out[o++] = (a << 2) | (b >> 4);
  } else if (remainder === 3) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    out[o++] = (a << 2) | (b >> 4);
    out[o++] = ((b & 15) << 4) | (c >> 2);
  }
  return out;
}

function base64ToSignedBytes(input: string): number[] {
  const bytes = base64ToBytes(input);
  const out = new Array<number>(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out[i] = b > 127 ? b - 256 : b;
  }
  return out;
}

function decodeRequiredSignedBytes(input: string, field: string): number[] {
  const bytes = base64ToSignedBytes(input);
  if (bytes.length === 0) {
    throw new Error(`NFC normalization failed: ${field} present but empty/malformed`);
  }
  return bytes;
}

function hexToUnsignedBytes(hex: string): number[] {
  // STRICT: reject non-hex characters and odd length rather than silently
  // stripping/truncating, which would produce a wrong DG hash.
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('NFC normalization failed: invalid hex (illegal characters)');
  }
  if (hex.length % 2 !== 0) {
    throw new Error('NFC normalization failed: invalid hex length (odd)');
  }
  const out: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

function asObject(raw: unknown): Json {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Json;
    } catch {
      // fall through to failure below
    }
  }
  if (raw && typeof raw === 'object') return raw as Json;
  throw new Error('NFC normalization failed: reader result is not an object');
}

function pickString(src: Json, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = src[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function normalizeDsc(raw: string): string {
  let s = raw.trim();
  // Legacy iOS shape emitted a JSON blob: {"PEM": "..."}.
  if (s.startsWith('{')) {
    try {
      const parsed = JSON.parse(s) as { PEM?: unknown };
      if (typeof parsed?.PEM === 'string') s = parsed.PEM.trim();
    } catch {
      // keep original string
    }
  }
  if (s.includes('BEGIN CERTIFICATE')) return s;
  const body = s.replace(/\s+/g, '');
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
}

function dgHashesObject(raw: unknown): Record<string, unknown> | undefined {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return undefined;
}

function dgHashHex(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const sodHash = (entry as { sodHash?: unknown }).sodHash;
    if (typeof sodHash === 'string') return sodHash;
  }
  return undefined;
}

function dgKeyToNumber(key: string): number | null {
  const match = key.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Normalize a passport NFC reader's raw JSON (string or already-parsed object)
 * into {@link PassportData}. Throws a precise error when a required, provable
 * field cannot be derived from the emitted keys — callers should treat a throw
 * as a scan failure and must NOT persist a partial document.
 */
export function normalizeNfcPassport(raw: unknown): PassportData {
  const src = asObject(raw);

  const mrzRaw = pickString(src, ['mrzString', 'mrz', 'passportMRZ']);
  if (!mrzRaw) {
    throw new Error('NFC normalization failed: missing MRZ (looked for mrzString/mrz/passportMRZ)');
  }
  const mrz = mrzRaw.replace(/[\r\n]/g, '');

  // signedAttr: iOS `signedAttributes`, Android native `eContent`.
  const signedAttrB64 = pickString(src, ['signedAttributes', 'eContent']);
  // eContent (encapsulated content): Android `encapContent`, legacy iOS `eContentBase64`.
  const eContentB64 = pickString(src, ['encapContent', 'eContentBase64']);
  // encryptedDigest (signature): Android `encryptedDigest`, iOS `signature`, legacy iOS `signatureBase64`.
  const encryptedDigestB64 = pickString(src, ['encryptedDigest', 'signature', 'signatureBase64']);
  const dscRaw = pickString(src, ['documentSigningCertificate', 'dsc']);

  const missing: string[] = [];
  if (!signedAttrB64) missing.push('signedAttr (signedAttributes|eContent)');
  if (!eContentB64) missing.push('eContent (encapContent|eContentBase64)');
  if (!encryptedDigestB64) missing.push('encryptedDigest (encryptedDigest|signature|signatureBase64)');
  if (!dscRaw) missing.push('dsc (documentSigningCertificate|dsc)');
  if (missing.length > 0) {
    throw new Error(`NFC normalization failed: missing required field(s): ${missing.join(', ')}`);
  }

  const eContent = decodeRequiredSignedBytes(eContentB64!, 'eContent');
  const signedAttr = decodeRequiredSignedBytes(signedAttrB64!, 'signedAttr');
  const encryptedDigest = decodeRequiredSignedBytes(encryptedDigestB64!, 'encryptedDigest');
  const dsc = normalizeDsc(dscRaw!);
  // A required field that is present but decodes to an empty PEM body is
  // malformed — fail closed rather than persisting an unprovable document.
  if (dsc.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '').length === 0) {
    throw new Error('NFC normalization failed: dsc present but empty/malformed');
  }

  const documentType: 'passport' | 'id_card' = mrz.length === 88 ? 'passport' : 'id_card';

  const passportData: PassportData = {
    mrz,
    eContent,
    signedAttr,
    encryptedDigest,
    dsc,
    documentType,
    documentCategory: documentType,
    mock: false,
  };

  const dgHashes = dgHashesObject(src['dataGroupHashes']);
  if (dgHashes) {
    const dg1Hex = dgHashHex(dgHashes['1'] ?? dgHashes['DG1']);
    const dg2Hex = dgHashHex(dgHashes['2'] ?? dgHashes['DG2']);
    if (dg1Hex) passportData.dg1Hash = hexToUnsignedBytes(dg1Hex);
    if (dg2Hex) passportData.dg2Hash = hexToUnsignedBytes(dg2Hex);

    const present = Object.keys(dgHashes)
      .map(dgKeyToNumber)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    if (present.length > 0) passportData.dgPresents = present;
  }

  return passportData;
}
