import { max_csca_bytes, max_dsc_bytes } from '../../foundation/constants/crypto.js';
import type { PassportData } from '../../foundation/types/document.js';
import { getCertificatePubKey, findStartPubKeyIndex } from '../../certificates/pubkey.js';
import {
  extractSignatureFromDSC,
  formatSignatureDSCCircuit,
} from '../../certificates/signature.js';
import { pad, padWithZeroes } from '../../documents/passport/core.js';
import { getCscaTreeInclusionProof, getLeafCscaTree } from '../../trees/index.js';

export function generateCircuitInputsDSC(
  passportData: PassportData,
  serializedCscaTree: string[][]
) {
  const passportMetadata = passportData.passportMetadata!;
  const cscaParsed = passportData.csca_parsed!;
  const dscParsed = passportData.dsc_parsed!;
  const raw_dsc = passportData.dsc;

  const cscaTbsBytesPadded = padWithZeroes(cscaParsed.tbsBytes, max_csca_bytes);
  const dscTbsBytes = dscParsed.tbsBytes;

  const [dscTbsBytesPadded, dscTbsBytesLen] = pad(passportMetadata.cscaHashFunction)(
    dscTbsBytes,
    max_dsc_bytes
  );

  const leaf = getLeafCscaTree(cscaParsed);
  const [root, path, siblings] = getCscaTreeInclusionProof(leaf, serializedCscaTree);

  const csca_pubKey_formatted = getCertificatePubKey(
    cscaParsed,
    passportMetadata.cscaSignatureAlgorithm,
    passportMetadata.cscaHashFunction
  );

  const signatureRaw = extractSignatureFromDSC(raw_dsc);
  const signature = formatSignatureDSCCircuit(
    passportMetadata.cscaSignatureAlgorithm,
    passportMetadata.cscaHashFunction,
    cscaParsed,
    signatureRaw
  );

  const [startIndex, keyLength] = findStartPubKeyIndex(
    cscaParsed,
    cscaTbsBytesPadded,
    passportMetadata.cscaSignatureAlgorithm
  );

  return {
    raw_csca: cscaTbsBytesPadded.map((x) => x.toString()),
    raw_csca_actual_length: BigInt(cscaParsed.tbsBytes.length).toString(),
    csca_pubKey_offset: startIndex.toString(),
    csca_pubKey_actual_size: BigInt(keyLength).toString(),
    raw_dsc: Array.from(dscTbsBytesPadded).map((x) => x.toString()),
    raw_dsc_padded_length: BigInt(dscTbsBytesLen).toString(),
    csca_pubKey: csca_pubKey_formatted,
    signature,
    merkle_root: root,
    path: path,
    siblings: siblings,
  };
}
