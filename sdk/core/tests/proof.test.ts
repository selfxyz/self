import test from 'node:test';
import assert from 'node:assert';
import { getRevealedDataPublicSignalsLength } from '../src/utils/proof.js';
import { ProofError } from '../src/errors/index.js';

test('throws on invalid attestation id', () => {
  assert.throws(() => getRevealedDataPublicSignalsLength(99 as any), ProofError);
});
