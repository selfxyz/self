import { Base8, inCurve, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub';

import { deserializeSignature } from '../../documents/kyc/api.js';
import { KYC_MAX_LENGTH } from '../../documents/kyc/constants.js';
import type { KycRegisterInput } from '../../documents/kyc/types.js';
import { serializeKycData } from '../../documents/kyc/types.js';
import { signEdDSA } from '../../crypto/eddsa.js';
import { NON_OFAC_DUMMY_KYC_DATA, OFAC_DUMMY_KYC_DATA } from '../../testing/genMockKycData.js';

export function generateKycRegisterInputs(
  applicantInfoBase64: string,
  signatureBase64: string,
  pubkeyStr: [string, string],
  secret: string,
): KycRegisterInput {
  const signature = deserializeSignature(signatureBase64);
  const pubkey = [BigInt(pubkeyStr[0]), BigInt(pubkeyStr[1])] as [bigint, bigint];

  // Use raw bytes directly — deserialize→reserialize strips the namespace prefix
  // from id_type, producing different bytes than the TEE signed.
  const raw = Buffer.from(applicantInfoBase64, 'base64');
  const dataPadded = [
    ...Array.from(raw, b => Number(b)),
    ...new Array(Math.max(0, KYC_MAX_LENGTH - raw.length)).fill(0),
  ];

  return {
    data_padded: dataPadded,
    s: signature.s,
    R: signature.R,
    pubKey: pubkey,
    secret,
  };
}

export function generateMockKycRegisterInputs(
  secretKey?: bigint | null,
  ofac?: boolean,
  secret?: string,
): KycRegisterInput {
  const kycData = ofac ? OFAC_DUMMY_KYC_DATA : NON_OFAC_DUMMY_KYC_DATA;
  const serializedData = serializeKycData(kycData).padEnd(KYC_MAX_LENGTH, '\0');
  const msgPadded = Array.from(serializedData, x => x.charCodeAt(0));

  const sk = secretKey ? secretKey : BigInt(Math.floor(Math.random() * Number(subOrder - 2n))) + 1n;

  const pk = mulPointEscalar(Base8, sk);
  console.assert(inCurve(pk), 'Point pk not on curve');
  console.assert(pk[0] != 0n && pk[1] != 0n, 'pk is zero');

  const [sig, pubKey] = signEdDSA(sk, msgPadded);
  console.assert(BigInt(sig.S) < subOrder, 's is greater than scalar field');

  return {
    data_padded: msgPadded.map(x => Number(x)),
    s: BigInt(sig.S),
    R: sig.R8 as [bigint, bigint],
    pubKey,
    secret: secret || '1234',
  };
}
