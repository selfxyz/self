// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const path = require('path');
const fs = require('fs');

const packageRoot = fs.realpathSync(__dirname);
const _iosSourceDir = fs.realpathSync(path.join(packageRoot, 'ios'));

module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: path.join(packageRoot, 'mobile-sdk-alpha.podspec'),
      },
      android: {
        sourceDir: path.join(packageRoot, 'android'),
        packageImportPath: 'import com.selfxyz.selfSDK.RNSelfPassportReaderPackage;',
        packageInstance: 'new RNSelfPassportReaderPackage()',
      },
    },
  },
  assets: ['./assets/fonts'],
};
