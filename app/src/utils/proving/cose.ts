import { decode, encode } from '@stablelib/cbor';
import { Buffer } from 'buffer';
import { ec as EC } from 'elliptic';
import { sha384 } from 'js-sha512';

export const cose = {
  sign: {
    verify: async (
      data: Buffer,
      verifier: { key: { x: string; y: string; curve: string } },
      _options: { defaultType: number },
    ) => {
      const decoded = decode(new Uint8Array(data));
      if (!Array.isArray(decoded) || decoded.length !== 4) {
        throw new Error('Invalid COSE_Sign1 format');
      }
      const [protectedHeaderBytes, _unprotectedHeader, payload, signature] =
        decoded;
      const externalAAD = new Uint8Array(0); // external_aad is empty here
      const sigStructure = [
        'Signature1',
        protectedHeaderBytes,
        externalAAD,
        payload,
      ];
      const sigStructureEncoded = encode(sigStructure);
      const hash = sha384(sigStructureEncoded);
      const sigBuffer = Buffer.from(signature);
      if (sigBuffer.length % 2 !== 0) {
        throw new Error('Invalid signature length');
      }
      const halfLen = sigBuffer.length / 2;
      const r = Buffer.from(sigBuffer.subarray(0, halfLen));
      const s = Buffer.from(sigBuffer.subarray(halfLen));
      const rHex = r.toString('hex');
      const sHex = s.toString('hex');
      const ecInstance = new EC(verifier.key.curve);
      const key = ecInstance.keyFromPublic(
        { x: verifier.key.x, y: verifier.key.y },
        'hex',
      );
      const valid = key.verify(hash, { r: rHex, s: sHex });
      if (!valid) {
        throw new Error('AWS root certificate signature verification failed');
      }
    },
  },
};

export default cose;
