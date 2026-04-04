import path from 'path';
import { defineConfig } from 'tsup';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entry = {
  // Root barrel
  index: 'src/index.ts',

  // Layer 0: Foundation
  'src/foundation/index': 'src/foundation/index.ts',
  'src/foundation/arrays': 'src/foundation/arrays.ts',
  'src/foundation/bytes': 'src/foundation/bytes.ts',
  'src/foundation/date': 'src/foundation/date.ts',
  'src/foundation/constants/index': 'src/foundation/constants/index.ts',
  'src/foundation/constants/circuit': 'src/foundation/constants/circuit.ts',
  'src/foundation/constants/countries': 'src/foundation/constants/countries.ts',
  'src/foundation/constants/crypto': 'src/foundation/constants/crypto.ts',
  'src/foundation/constants/disclosure': 'src/foundation/constants/disclosure.ts',
  'src/foundation/constants/identity': 'src/foundation/constants/identity.ts',
  'src/foundation/constants/network': 'src/foundation/constants/network.ts',
  'src/foundation/types/index': 'src/foundation/types/index.ts',
  'src/foundation/types/app': 'src/foundation/types/app.ts',
  'src/foundation/types/attestation': 'src/foundation/types/attestation.ts',
  'src/foundation/types/certificate': 'src/foundation/types/certificate.ts',
  'src/foundation/types/circuit': 'src/foundation/types/circuit.ts',
  'src/foundation/types/document': 'src/foundation/types/document.ts',
  'src/foundation/types/environment': 'src/foundation/types/environment.ts',

  // Layer 1: Crypto
  'src/crypto/index': 'src/crypto/index.ts',
  'src/crypto/encryption': 'src/crypto/encryption.ts',
  'src/crypto/identity': 'src/crypto/identity.ts',
  'src/crypto/scope': 'src/crypto/scope.ts',
  'src/crypto/sha-pad': 'src/crypto/sha-pad.ts',
  'src/crypto/eddsa': 'src/crypto/eddsa.ts',
  'src/crypto/hash/index': 'src/crypto/hash/index.ts',
  'src/crypto/hash/poseidon': 'src/crypto/hash/poseidon.ts',
  'src/crypto/hash/sha': 'src/crypto/hash/sha.ts',

  // Layer 1.5: Certificates
  'src/certificates/index': 'src/certificates/index.ts',
  'src/certificates/csca': 'src/certificates/csca.ts',
  'src/certificates/factory': 'src/certificates/factory.ts',
  'src/certificates/pubkey': 'src/certificates/pubkey.ts',
  'src/certificates/signature': 'src/certificates/signature.ts',
  'src/certificates/types': 'src/certificates/types.ts',
  'src/certificates/parsing/index': 'src/certificates/parsing/index.ts',
  'src/certificates/parsing/bruteForceSignature': 'src/certificates/parsing/bruteForceSignature.ts',
  'src/certificates/parsing/curves': 'src/certificates/parsing/curves.ts',
  'src/certificates/parsing/elliptic': 'src/certificates/parsing/elliptic.ts',
  'src/certificates/parsing/oids': 'src/certificates/parsing/oids.ts',
  'src/certificates/parsing/parseCertificateSimple': 'src/certificates/parsing/parseCertificateSimple.ts',
  'src/certificates/parsing/parseDscCertificateData': 'src/certificates/parsing/parseDscCertificateData.ts',
  'src/certificates/parsing/utils': 'src/certificates/parsing/utils.ts',

  // Layer 2: Documents
  'src/documents/index': 'src/documents/index.ts',
  'src/documents/factory': 'src/documents/factory.ts',
  'src/documents/interface': 'src/documents/interface.ts',
  'src/documents/passport/index': 'src/documents/passport/index.ts',
  'src/documents/passport/adapter': 'src/documents/passport/adapter.ts',
  'src/documents/passport/bruteForcePassportSignature': 'src/documents/passport/bruteForcePassportSignature.ts',
  'src/documents/passport/commitment': 'src/documents/passport/commitment.ts',
  'src/documents/passport/core': 'src/documents/passport/core.ts',
  'src/documents/passport/format': 'src/documents/passport/format.ts',
  'src/documents/passport/parsing': 'src/documents/passport/parsing.ts',
  'src/documents/aadhaar/index': 'src/documents/aadhaar/index.ts',
  'src/documents/aadhaar/adapter': 'src/documents/aadhaar/adapter.ts',
  'src/documents/aadhaar/constants': 'src/documents/aadhaar/constants.ts',
  'src/documents/aadhaar/utils': 'src/documents/aadhaar/utils.ts',
  'src/documents/aadhaar/qr': 'src/documents/aadhaar/qr.ts',
  'src/documents/kyc/index': 'src/documents/kyc/index.ts',
  'src/documents/kyc/adapter': 'src/documents/kyc/adapter.ts',
  'src/documents/kyc/api': 'src/documents/kyc/api.ts',
  'src/documents/kyc/constants': 'src/documents/kyc/constants.ts',
  'src/documents/kyc/types': 'src/documents/kyc/types.ts',
  'src/documents/kyc/utils': 'src/documents/kyc/utils.ts',

  // Layer 2: Circuits
  'src/circuits/index': 'src/circuits/index.ts',
  'src/circuits/types': 'src/circuits/types.ts',
  'src/circuits/generator': 'src/circuits/generator.ts',
  'src/circuits/userId': 'src/circuits/userId.ts',
  'src/circuits/circuitName': 'src/circuits/circuitName.ts',
  'src/circuits/inputs/index': 'src/circuits/inputs/index.ts',
  'src/circuits/inputs/disclose': 'src/circuits/inputs/disclose.ts',
  'src/circuits/inputs/dsc': 'src/circuits/inputs/dsc.ts',
  'src/circuits/inputs/format': 'src/circuits/inputs/format.ts',
  'src/circuits/inputs/ofac': 'src/circuits/inputs/ofac.ts',
  'src/circuits/inputs/register': 'src/circuits/inputs/register.ts',
  'src/circuits/inputs/register-aadhaar': 'src/circuits/inputs/register-aadhaar.ts',
  'src/circuits/inputs/disclose-aadhaar': 'src/circuits/inputs/disclose-aadhaar.ts',
  'src/circuits/inputs/register-kyc': 'src/circuits/inputs/register-kyc.ts',
  'src/circuits/inputs/disclose-kyc': 'src/circuits/inputs/disclose-kyc.ts',
  'src/circuits/outputs/index': 'src/circuits/outputs/index.ts',
  'src/circuits/outputs/format': 'src/circuits/outputs/format.ts',

  // Layer 2: Trees
  'src/trees/index': 'src/trees/index.ts',
  'src/trees/aadhaarLeafBuilder': 'src/trees/aadhaarLeafBuilder.ts',
  'src/trees/certificate': 'src/trees/certificate.ts',
  'src/trees/kycLeafBuilder': 'src/trees/kycLeafBuilder.ts',
  'src/trees/leafBuilder': 'src/trees/leafBuilder.ts',
  'src/trees/ofac': 'src/trees/ofac.ts',
  'src/trees/passportLeafBuilder': 'src/trees/passportLeafBuilder.ts',
  'src/trees/proof': 'src/trees/proof.ts',

  // Layer 2: Attestation
  'src/attestation/index': 'src/attestation/index.ts',
  'src/attestation/gcp': 'src/attestation/gcp.ts',
  'src/blockchain/index': 'src/blockchain/index.ts',
  'src/blockchain/contractErrors': 'src/blockchain/contractErrors.ts',
  'src/blockchain/proving': 'src/blockchain/proving.ts',
  'src/blockchain/forbiddenCountries': 'src/blockchain/forbiddenCountries.ts',
  'src/blockchain/formatCallData': 'src/blockchain/formatCallData.ts',
  'src/blockchain/ofac': 'src/blockchain/ofac.ts',

  // Layer 3: App
  'src/app/index': 'src/app/index.ts',
  'src/app/builder': 'src/app/builder.ts',

  // Data
  'src/data/index': 'src/data/index.ts',
  'src/data/countries': 'src/data/countries.ts',
  'src/data/mockCertificates': 'src/data/mockCertificates.ts',
  'src/data/sampleDataHashes': 'src/data/sampleDataHashes.ts',
  'src/data/skiPem': 'src/data/skiPem.ts',

  // Testing
  'src/testing/index': 'src/testing/index.ts',
  'src/testing/dg1': 'src/testing/dg1.ts',
  'src/testing/genMockIdDoc': 'src/testing/genMockIdDoc.ts',
  'src/testing/genMockPassportData': 'src/testing/genMockPassportData.ts',
  'src/testing/getMockDSC': 'src/testing/getMockDSC.ts',
  'src/testing/mockAadhaarCert': 'src/testing/mockAadhaarCert.ts',
  'src/testing/genMockAadhaarData': 'src/testing/genMockAadhaarData.ts',
  'src/testing/genMockKycData': 'src/testing/genMockKycData.ts',
};

export default defineConfig([
  // ESM build
  {
    tsconfig: './tsconfig.json',
    entry: entry,
    format: ['esm'],
    outDir: path.resolve(__dirname, 'dist/esm'),
    outExtension: () => ({ js: '.js' }),
    dts: false, // Generated separately via build:types
    splitting: false,
    clean: true,
    sourcemap: true,
    target: 'es2020',
    platform: 'neutral',
    external: [
      /^@openpassport/,
      /^@zk-email/,
      /^@anon-aadhaar/,
      /^@zk-kit/,
      /^asn1/,
      /^elliptic/,
      /^ethers/,
      /^hash\.js/,
      /^i18n-/,
      /^js-/,
      /^node-forge/,
      /^pkijs/,
      /^poseidon-/,
    ],
  },
  // CJS build
  {
    tsconfig: './tsconfig.json',
    entry: entry,
    format: ['cjs'],
    outDir: path.resolve(__dirname, 'dist/cjs'),
    outExtension: () => ({ js: '.cjs' }),
    dts: false,
    splitting: false,
    clean: false,
    sourcemap: true,
    target: 'es2020',
    platform: 'neutral',
    external: [
      /^@openpassport/,
      /^@zk-email/,
      /^@anon-aadhaar/,
      /^@zk-kit/,
      /^asn1/,
      /^elliptic/,
      /^ethers/,
      /^hash\.js/,
      /^i18n-/,
      /^js-/,
      /^node-forge/,
      /^pkijs/,
      /^poseidon-/,
    ],
  },
]);
