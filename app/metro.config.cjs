// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const monorepoRoot = path.resolve(__dirname, '../');
const commonPath = path.join(__dirname, '/../common');
const sdkAlphaPath = path.join(__dirname, '/../packages/mobile-sdk-alpha');
const trueMonorepoNodeModules = path.resolve(__dirname, '../node_modules');
const extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
  '@babel/runtime': path.join(trueMonorepoNodeModules, '@babel/runtime'),
  // Pin React and React Native to monorepo root
  react: path.join(trueMonorepoNodeModules, 'react'),
  'react-native': path.join(trueMonorepoNodeModules, 'react-native'),
  '@': path.join(__dirname, 'src'),
  '@selfxyz/common': path.resolve(commonPath, 'dist'),
  '@selfxyz/mobile-sdk-alpha': path.resolve(sdkAlphaPath, 'dist'),
  '@selfxyz/mobile-sdk-alpha/constants/analytics': path.resolve(
    sdkAlphaPath,
    'dist/esm/constants/analytics.js',
  ),
  '@selfxyz/mobile-sdk-alpha/stores': path.resolve(
    sdkAlphaPath,
    'dist/esm/stores.js',
  ),
  // Main exports
  '@selfxyz/common/utils': path.resolve(
    commonPath,
    'dist/esm/src/utils/index.js',
  ),
  '@selfxyz/common/types': path.resolve(
    commonPath,
    'dist/esm/src/types/index.js',
  ),
  '@selfxyz/common/constants': path.resolve(
    commonPath,
    'dist/esm/src/constants/index.js',
  ),
  // Constants subpaths
  '@selfxyz/common/constants/countries': path.resolve(
    commonPath,
    'dist/esm/src/constants/countries.js',
  ),
  '@selfxyz/common/constants/vkey': path.resolve(
    commonPath,
    'dist/esm/src/constants/vkey.js',
  ),
  '@selfxyz/common/constants/skiPem': path.resolve(
    commonPath,
    'dist/esm/src/constants/skiPem.js',
  ),
  '@selfxyz/common/constants/mockCerts': path.resolve(
    commonPath,
    'dist/esm/src/constants/mockCertificates.js',
  ),
  '@selfxyz/common/constants/hashes': path.resolve(
    commonPath,
    'dist/esm/src/constants/sampleDataHashes.js',
  ),
  // Utils subpaths
  '@selfxyz/common/utils/hash': path.resolve(
    commonPath,
    'dist/esm/src/utils/hash.js',
  ),
  '@selfxyz/common/utils/attest': path.resolve(
    commonPath,
    'dist/esm/src/utils/attest.js',
  ),
  '@selfxyz/common/utils/bytes': path.resolve(
    commonPath,
    'dist/esm/src/utils/bytes.js',
  ),
  '@selfxyz/common/utils/trees': path.resolve(
    commonPath,
    'dist/esm/src/utils/trees.js',
  ),
  '@selfxyz/common/utils/scope': path.resolve(
    commonPath,
    'dist/esm/src/utils/scope.js',
  ),
  '@selfxyz/common/utils/proving': path.resolve(
    commonPath,
    'dist/esm/src/utils/proving.js',
  ),
  '@selfxyz/common/utils/appType': path.resolve(
    commonPath,
    'dist/esm/src/utils/appType.js',
  ),
  '@selfxyz/common/utils/date': path.resolve(
    commonPath,
    'dist/esm/src/utils/date.js',
  ),
  '@selfxyz/common/utils/arrays': path.resolve(
    commonPath,
    'dist/esm/src/utils/arrays.js',
  ),
  '@selfxyz/common/utils/passports': path.resolve(
    commonPath,
    'dist/esm/src/utils/passports/index.js',
  ),
  '@selfxyz/common/utils/passportFormat': path.resolve(
    commonPath,
    'dist/esm/src/utils/passports/format.js',
  ),
  '@selfxyz/common/utils/passports/validate': path.resolve(
    commonPath,
    'dist/esm/src/utils/passports/validate.js',
  ),
  '@selfxyz/common/utils/passportMock': path.resolve(
    commonPath,
    'dist/esm/src/utils/passports/mock.js',
  ),
  '@selfxyz/common/utils/passportDg1': path.resolve(
    commonPath,
    'dist/esm/src/utils/passports/dg1.js',
  ),
  '@selfxyz/common/utils/certificates': path.resolve(
    commonPath,
    'dist/esm/src/utils/certificate_parsing/index.js',
  ),
  '@selfxyz/common/utils/elliptic': path.resolve(
    commonPath,
    'dist/esm/src/utils/certificate_parsing/elliptic.js',
  ),
  '@selfxyz/common/utils/curves': path.resolve(
    commonPath,
    'dist/esm/src/utils/certificate_parsing/curves.js',
  ),
  '@selfxyz/common/utils/oids': path.resolve(
    commonPath,
    'dist/esm/src/utils/certificate_parsing/oids.js',
  ),
  '@selfxyz/common/utils/circuits': path.resolve(
    commonPath,
    'dist/esm/src/utils/circuits/index.js',
  ),
  '@selfxyz/common/utils/circuitNames': path.resolve(
    commonPath,
    'dist/esm/src/utils/circuits/circuitsName.js',
  ),
  '@selfxyz/common/utils/circuitFormat': path.resolve(
    commonPath,
    'dist/esm/src/utils/circuits/formatOutputs.js',
  ),
  '@selfxyz/common/utils/uuid': path.resolve(
    commonPath,
    'dist/esm/src/utils/circuits/uuid.js',
  ),
  '@selfxyz/common/utils/contracts': path.resolve(
    commonPath,
    'dist/esm/src/utils/contracts/index.js',
  ),
  '@selfxyz/common/utils/sanctions': path.resolve(
    commonPath,
    'dist/esm/src/utils/contracts/forbiddenCountries.js',
  ),
  '@selfxyz/common/utils/csca': path.resolve(
    commonPath,
    'dist/esm/src/utils/csca.js',
  ),
  '@selfxyz/common/utils/ofac': path.resolve(
    commonPath,
    'dist/esm/src/utils/ofac.js',
  ),
  // Types subpaths
  '@selfxyz/common/types/passport': path.resolve(
    commonPath,
    'dist/esm/src/types/passport.js',
  ),
  '@selfxyz/common/types/app': path.resolve(
    commonPath,
    'dist/esm/src/types/app.js',
  ),
  '@selfxyz/common/types/certificates': path.resolve(
    commonPath,
    'dist/esm/src/types/certificates.js',
  ),
  '@selfxyz/common/types/circuits': path.resolve(
    commonPath,
    'dist/esm/src/types/circuits.js',
  ),
};
const watchFolders = [
  path.resolve(commonPath),
  trueMonorepoNodeModules,
  path.join(__dirname, 'src'),
  path.resolve(sdkAlphaPath),
];

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/react-native',
    ),
    disableImportExportTransform: true,
    inlineRequires: true,
  },
  resolver: {
    extraNodeModules,
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'), // App's own node_modules
      path.resolve(monorepoRoot, 'node_modules'), // Monorepo root node_modules
      trueMonorepoNodeModules,
      // Add paths to other package workspaces if needed
    ],
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
  watchFolders,
};

module.exports = mergeConfig(defaultConfig, config);
