import test from 'node:test';
import assert from 'node:assert';
import { RegistryContractError, VerifierContractError } from '../src/errors/index.js';

test('creates registry contract error', () => {
  const err = new RegistryContractError('Registry contract not found');
  assert.equal(err.name, 'RegistryContractError');
});

test('creates verifier contract error', () => {
  const err = new VerifierContractError('Verifier contract not found');
  assert.equal(err.name, 'VerifierContractError');
});
