import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const __dirname = process.cwd();
const DIST = path.resolve(__dirname, 'dist');

// Read the version from the main package.json
const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

writeFileSync(path.join(DIST, 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4));
writeFileSync(
  path.join(DIST, 'cjs', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 4)
);

// Create a package.json in the dist root for Metro compatibility
const distPackageJson = {
  name: '@selfxyz/common',
  version: packageJson.version,
  type: 'module',
  exports: {
    '.': './esm/index.js',
    './constants': './esm/src/constants/index.js',
    './utils': './esm/src/utils/index.js',
    './types': './esm/src/types/index.js',
  },
};
writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));

// Create shim files for Metro compatibility
// Metro sometimes doesn't properly resolve package.json exports, so we create direct file shims

// Helper function to create shim files
function createShim(shimPath, targetPath, name) {
  const shimDir = path.join(DIST, shimPath);
  mkdirSync(shimDir, { recursive: true });

  // Convert ESM path to CommonJS path for proper require() compatibility
  const cjsTargetPath = targetPath.replace('/esm/', '/cjs/').replace('.js', '.cjs');

  writeFileSync(
    path.join(shimDir, 'index.js'),
    `// Shim file to help Metro resolve @selfxyz/common/${name}
module.exports = require('${cjsTargetPath}');`
  );
  writeFileSync(
    path.join(shimDir, 'index.d.ts'),
    `// Shim file to help Metro resolve @selfxyz/common/${name} types
export * from '${targetPath.replace('.js', '')}';`
  );
}

// Main category shims
createShim('utils', '../esm/src/utils/index.js', 'utils');
createShim('types', '../esm/src/types/index.js', 'types');
createShim('constants', '../esm/src/constants/index.js', 'constants');

// Constants granular shims
createShim('constants/core', '../../esm/src/constants/constants.js', 'constants/core');
createShim('constants/countries', '../../esm/src/constants/countries.js', 'constants/countries');
createShim('constants/vkeys', '../../esm/src/constants/vkey.js', 'constants/vkeys');
createShim('constants/ski-pem', '../../esm/src/constants/skiPem.js', 'constants/ski-pem');
createShim(
  'constants/mock-certs',
  '../../esm/src/constants/mockCertificates.js',
  'constants/mock-certs'
);
createShim('constants/hashes', '../../esm/src/constants/sampleDataHashes.js', 'constants/hashes');

// Utils granular shims
createShim('utils/hash', '../../esm/src/utils/hash.js', 'utils/hash');
createShim('utils/bytes', '../../esm/src/utils/bytes.js', 'utils/bytes');
createShim('utils/trees', '../../esm/src/utils/trees.js', 'utils/trees');
createShim('utils/scope', '../../esm/src/utils/scope.js', 'utils/scope');
createShim('utils/app-type', '../../esm/src/utils/appType.js', 'utils/app-type');
createShim('utils/date', '../../esm/src/utils/date.js', 'utils/date');
createShim('utils/arrays', '../../esm/src/utils/arrays.js', 'utils/arrays');
createShim('utils/passports', '../../esm/src/utils/passports/index.js', 'utils/passports');
createShim(
  'utils/passports/format',
  '../../../esm/src/utils/passports/format.js',
  'utils/passports/format'
);
createShim(
  'utils/passport-format',
  '../../esm/src/utils/passports/format.js',
  'utils/passport-format'
);
createShim('utils/passport-mock', '../../esm/src/utils/passports/mock.js', 'utils/passport-mock');
createShim('utils/passport-dg1', '../../esm/src/utils/passports/dg1.js', 'utils/passport-dg1');
createShim(
  'utils/certificates',
  '../../esm/src/utils/certificate_parsing/index.js',
  'utils/certificates'
);
createShim(
  'utils/certificate_parsing/elliptic',
  '../../../esm/src/utils/certificate_parsing/elliptic.js',
  'utils/certificate_parsing/elliptic'
);
createShim(
  'utils/elliptic',
  '../../esm/src/utils/certificate_parsing/elliptic.js',
  'utils/elliptic'
);
createShim('utils/curves', '../../esm/src/utils/certificate_parsing/curves.js', 'utils/curves');
createShim('utils/oids', '../../esm/src/utils/certificate_parsing/oids.js', 'utils/oids');
createShim('utils/circuits', '../../esm/src/utils/circuits/index.js', 'utils/circuits');
createShim(
  'utils/circuit-names',
  '../../esm/src/utils/circuits/circuitsName.js',
  'utils/circuit-names'
);
createShim(
  'utils/circuits/circuitsName',
  '../../esm/src/utils/circuits/circuitsName.js',
  'utils/circuits/circuitsName'
);
createShim(
  'utils/circuit-format',
  '../../esm/src/utils/circuits/formatOutputs.js',
  'utils/circuit-format'
);
createShim('utils/uuid', '../../esm/src/utils/circuits/uuid.js', 'utils/uuid');
createShim('utils/contracts', '../../esm/src/utils/contracts/index.js', 'utils/contracts');
createShim(
  'utils/sanctions',
  '../../esm/src/utils/contracts/forbiddenCountries.js',
  'utils/sanctions'
);
createShim('utils/csca', '../../esm/src/utils/csca.js', 'utils/csca');

// Level 3 Hash Function shims
createShim('utils/hash/poseidon', '../../../esm/src/utils/hash/poseidon.js', 'utils/hash/poseidon');
createShim('utils/hash/sha', '../../../esm/src/utils/hash/sha.js', 'utils/hash/sha');
createShim('utils/hash/custom', '../../../esm/src/utils/hash/custom.js', 'utils/hash/custom');

// Types granular shims
createShim('types/passport', '../../esm/src/types/passport.js', 'types/passport');
createShim('types/app', '../../esm/src/types/app.js', 'types/app');
createShim('types/certificates', '../../esm/src/types/certificates.js', 'types/certificates');
createShim('types/circuits', '../../esm/src/types/circuits.js', 'types/circuits');
