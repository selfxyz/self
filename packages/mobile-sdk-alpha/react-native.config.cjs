// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

module.exports = {
  dependency: {
    platforms: {
      ios: {
        sourceDir: './ios',
        podspecPath: './mobile-sdk-alpha.podspec',
      },
      android: {
        sourceDir: './android',
        manifestPath: 'src/main/AndroidManifest.xml',
        packageImportPath: 'import com.selfxyz.selfSDK.RNSelfPassportReaderPackage;',
        packageInstance: 'new RNSelfPassportReaderPackage()',
      },
    },
  },
};
