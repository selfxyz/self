import { countryCodes, DEFAULT_MAJORITY } from '../../../common/src/constants/constants';

type CircuitType = 'prove';
type AlgorithmType = 'rsa_sha256' | 'rsa_sha1' | 'rsapss_sha256';

export const scope = '@spaceShips';
export const majority = DEFAULT_MAJORITY;
export const alphaCode = 'FRA';
export const dateOfBirth = '000101';
export const dateOfExpiry = '300101';
export const getCountryName = () => {
  const countryName = countryCodes[alphaCode as keyof typeof countryCodes];
  if (!countryName) {
    throw new Error(`Country name not found for alpha code: ${alphaCode}`);
  }
  return countryName;
};

export interface TestCase {
  circuitType: CircuitType;
  algorithm: AlgorithmType;
  wasmPath: string;
  zkeyPath: string;
}

export const testCases: TestCase[] = [
  {
    circuitType: 'prove',
    algorithm: 'rsa_sha256',
    wasmPath: '../circuits/build/fromAWS/prove_rsa_65537_sha256.wasm',
    zkeyPath: '../circuits/build/fromAWS/prove_rsa_65537_sha256.zkey',
  },
  {
    circuitType: 'prove',
    algorithm: 'rsa_sha1',
    wasmPath: '../circuits/build/fromAWS/prove_rsa_65537_sha1.wasm',
    zkeyPath: '../circuits/build/fromAWS/prove_rsa_65537_sha1.zkey',
  },
  {
    circuitType: 'prove',
    algorithm: 'rsapss_sha256',
    wasmPath: '../circuits/build/fromAWS/prove_rsapss_65537_sha256.wasm',
    zkeyPath: '../circuits/build/fromAWS/prove_rsapss_65537_sha256.zkey',
  },
];
