import { poseidon2 } from 'poseidon-lite';
import { max_csca_bytes, max_dsc_bytes } from '../foundation/constants/crypto.js';
import type { CertificateData } from '../foundation/types/certificate.js';
import { packBytesAndPoseidon } from '../crypto/hash/poseidon.js';
import { pad, padWithZeroes } from '../documents/passport/core.js';

function getLeaf(parsed: CertificateData, type: 'dsc' | 'csca'): string {
  if (type === 'dsc') {
    const tbsArray = Object.keys(parsed.tbsBytes).map(key => parsed.tbsBytes[key as any]);
    const [paddedTbsBytes] = pad(parsed.hashAlgorithm)(tbsArray, max_dsc_bytes);
    const dsc_hash = packBytesAndPoseidon(Array.from(paddedTbsBytes));
    return poseidon2([dsc_hash, tbsArray.length]).toString();
  } else {
    const tbsBytesArray = Array.from(parsed.tbsBytes);
    const paddedTbsBytesArray = padWithZeroes(tbsBytesArray, max_csca_bytes);
    const csca_hash = packBytesAndPoseidon(paddedTbsBytesArray);
    return poseidon2([csca_hash, tbsBytesArray.length]).toString();
  }
}

export function getLeafCscaTree(csca_parsed: CertificateData): string {
  return getLeaf(csca_parsed, 'csca');
}

export function getLeafDscTree(dsc_parsed: CertificateData, csca_parsed: CertificateData): string {
  const dscLeaf = getLeaf(dsc_parsed, 'dsc');
  const cscaLeaf = getLeaf(csca_parsed, 'csca');
  return poseidon2([dscLeaf, cscaLeaf]).toString();
}
