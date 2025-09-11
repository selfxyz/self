// Shim configurations organized by group and alphabetically by shimPath
export const shimConfigs = [
  // ===== CONSTANTS =====
  { shimPath: 'constants', targetPath: '../esm/src/constants/index.js', name: 'constants' },
  {
    shimPath: 'constants/core',
    targetPath: '../../esm/src/constants/constants.js',
    name: 'constants/core',
  },
  {
    shimPath: 'constants/countries',
    targetPath: '../../esm/src/constants/countries.js',
    name: 'constants/countries',
  },
  {
    shimPath: 'constants/hashes',
    targetPath: '../../esm/src/constants/sampleDataHashes.js',
    name: 'constants/hashes',
  },
  {
    shimPath: 'constants/mockCerts',
    targetPath: '../../esm/src/constants/mockCertificates.js',
    name: 'constants/mockCerts',
  },
  {
    shimPath: 'constants/skiPem',
    targetPath: '../../esm/src/constants/skiPem.js',
    name: 'constants/skiPem',
  },
  {
    shimPath: 'constants/vkey',
    targetPath: '../../esm/src/constants/vkey.js',
    name: 'constants/vkey',
  },

  // ===== TYPES =====
  { shimPath: 'types', targetPath: '../esm/src/types/index.js', name: 'types' },
  { shimPath: 'types/app', targetPath: '../../esm/src/types/app.js', name: 'types/app' },
  {
    shimPath: 'types/certificates',
    targetPath: '../../esm/src/types/certificates.js',
    name: 'types/certificates',
  },
  {
    shimPath: 'types/circuits',
    targetPath: '../../esm/src/types/circuits.js',
    name: 'types/circuits',
  },
  {
    shimPath: 'types/passport',
    targetPath: '../../esm/src/types/passport.js',
    name: 'types/passport',
  },

  // ===== UTILS =====
  { shimPath: 'utils', targetPath: '../esm/src/utils/index.js', name: 'utils' },
  {
    shimPath: 'utils/aadhaar/constants',
    targetPath: '../../../esm/src/utils/aadhaar/constants.js',
    name: 'utils/aadhaar/constants',
  },
  {
    shimPath: 'utils/appType',
    targetPath: '../../esm/src/utils/appType.js',
    name: 'utils/appType',
  },
  { shimPath: 'utils/arrays', targetPath: '../../esm/src/utils/arrays.js', name: 'utils/arrays' },
  { shimPath: 'utils/bytes', targetPath: '../../esm/src/utils/bytes.js', name: 'utils/bytes' },
  {
    shimPath: 'utils/certificate_parsing/elliptic',
    targetPath: '../../../esm/src/utils/certificate_parsing/elliptic.js',
    name: 'utils/certificate_parsing/elliptic',
  },
  {
    shimPath: 'utils/certificates',
    targetPath: '../../esm/src/utils/certificate_parsing/index.js',
    name: 'utils/certificates',
  },
  {
    shimPath: 'utils/certificates/certUtils',
    targetPath: '../../../esm/src/utils/certificate_parsing/certUtils.js',
    name: 'utils/certificates/certUtils',
  },
  {
    shimPath: 'utils/certificates/curveUtils',
    targetPath: '../../../esm/src/utils/certificate_parsing/curveUtils.js',
    name: 'utils/certificates/curveUtils',
  },
  {
    shimPath: 'utils/certificates/ellipticInit',
    targetPath: '../../../esm/src/utils/certificate_parsing/ellipticInit.js',
    name: 'utils/certificates/ellipticInit',
  },
  {
    shimPath: 'utils/certificates/oidUtils',
    targetPath: '../../../esm/src/utils/certificate_parsing/oidUtils.js',
    name: 'utils/certificates/oidUtils',
  },
  {
    shimPath: 'utils/certificates/parseNode',
    targetPath: '../../../esm/src/utils/certificate_parsing/parseNode.js',
    name: 'utils/certificates/parseNode',
  },
  {
    shimPath: 'utils/certificates/parseSimple',
    targetPath: '../../../esm/src/utils/certificate_parsing/parseSimple.js',
    name: 'utils/certificates/parseSimple',
  },
  {
    shimPath: 'utils/circuitFormat',
    targetPath: '../../esm/src/utils/circuits/formatOutputs.js',
    name: 'utils/circuitFormat',
  },
  {
    shimPath: 'utils/circuitNames',
    targetPath: '../../esm/src/utils/circuits/circuitsName.js',
    name: 'utils/circuitNames',
  },
  {
    shimPath: 'utils/circuits',
    targetPath: '../../esm/src/utils/circuits/index.js',
    name: 'utils/circuits',
  },
  {
    shimPath: 'utils/circuits/circuitsName',
    targetPath: '../../esm/src/utils/circuits/circuitsName.js',
    name: 'utils/circuits/circuitsName',
  },
  {
    shimPath: 'utils/circuits/discloseInputs',
    targetPath: '../../../esm/src/utils/circuits/discloseInputs.js',
    name: 'utils/circuits/discloseInputs',
  },
  {
    shimPath: 'utils/circuits/dscInputs',
    targetPath: '../../../esm/src/utils/circuits/dscInputs.js',
    name: 'utils/circuits/dscInputs',
  },
  {
    shimPath: 'utils/circuits/ofacInputs',
    targetPath: '../../../esm/src/utils/circuits/ofacInputs.js',
    name: 'utils/circuits/ofacInputs',
  },
  {
    shimPath: 'utils/circuits/registerInputs',
    targetPath: '../../../esm/src/utils/circuits/registerInputs.js',
    name: 'utils/circuits/registerInputs',
  },
  {
    shimPath: 'utils/attest',
    targetPath: '../../esm/src/utils/attest.js',
    name: 'utils/attest',
  },
  {
    shimPath: 'utils/contracts',
    targetPath: '../../esm/src/utils/contracts/index.js',
    name: 'utils/contracts',
  },
  { shimPath: 'utils/csca', targetPath: '../../esm/src/utils/csca.js', name: 'utils/csca' },
  {
    shimPath: 'utils/curves',
    targetPath: '../../esm/src/utils/certificate_parsing/curves.js',
    name: 'utils/curves',
  },
  { shimPath: 'utils/date', targetPath: '../../esm/src/utils/date.js', name: 'utils/date' },
  {
    shimPath: 'utils/elliptic',
    targetPath: '../../esm/src/utils/certificate_parsing/elliptic.js',
    name: 'utils/elliptic',
  },
  { shimPath: 'utils/hash', targetPath: '../../esm/src/utils/hash.js', name: 'utils/hash' },
  {
    shimPath: 'utils/hash/custom',
    targetPath: '../../../esm/src/utils/hash/custom.js',
    name: 'utils/hash/custom',
  },
  {
    shimPath: 'utils/hash/poseidon',
    targetPath: '../../../esm/src/utils/hash/poseidon.js',
    name: 'utils/hash/poseidon',
  },
  {
    shimPath: 'utils/hash/sha',
    targetPath: '../../../esm/src/utils/hash/sha.js',
    name: 'utils/hash/sha',
  },
  {
    shimPath: 'utils/oids',
    targetPath: '../../esm/src/utils/certificate_parsing/oids.js',
    name: 'utils/oids',
  },
  {
    shimPath: 'utils/ofac',
    targetPath: '../../esm/src/utils/ofac.js',
    name: 'utils/ofac',
  },
  {
    shimPath: 'utils/passportDg1',
    targetPath: '../../esm/src/utils/passports/dg1.js',
    name: 'utils/passportDg1',
  },
  {
    shimPath: 'utils/passportFormat',
    targetPath: '../../esm/src/utils/passports/format.js',
    name: 'utils/passportFormat',
  },
  {
    shimPath: 'utils/passportMock',
    targetPath: '../../esm/src/utils/passports/mock.js',
    name: 'utils/passportMock',
  },
  {
    shimPath: 'utils/passports',
    targetPath: '../../esm/src/utils/passports/index.js',
    name: 'utils/passports',
  },
  {
    shimPath: 'utils/passports/format',
    targetPath: '../../../esm/src/utils/passports/format.js',
    name: 'utils/passports/format',
  },
  {
    shimPath: 'utils/passports/mockDsc',
    targetPath: '../../../esm/src/utils/passports/mockDsc.js',
    name: 'utils/passports/mockDsc',
  },
  {
    shimPath: 'utils/passports/validate',
    targetPath: '../../../esm/src/utils/passports/validate.js',
    name: 'utils/passports/validate',
  },
  {
    shimPath: 'utils/passports/mockGeneration',
    targetPath: '../../../esm/src/utils/passports/mockGeneration.js',
    name: 'utils/passports/mockGeneration',
  },
  {
    shimPath: 'utils/sanctions',
    targetPath: '../../esm/src/utils/contracts/forbiddenCountries.js',
    name: 'utils/sanctions',
  },
  { shimPath: 'utils/scope', targetPath: '../../esm/src/utils/scope.js', name: 'utils/scope' },
  {
    shimPath: 'utils/proving',
    targetPath: '../../esm/src/utils/proving.js',
    name: 'utils/proving',
  },
  { shimPath: 'utils/trees', targetPath: '../../esm/src/utils/trees.js', name: 'utils/trees' },
  {
    shimPath: 'utils/uuid',
    targetPath: '../../esm/src/utils/circuits/uuid.js',
    name: 'utils/uuid',
  },
];
