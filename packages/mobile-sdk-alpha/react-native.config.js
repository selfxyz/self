module.exports = {
  dependencies: {
    '@selfxyz/mobile-sdk-alpha': {
      platforms: {
        ios: {
          sourceDir: './ios',
          podspecPath: './mobile-sdk-alpha.podspec',
        },
        android: {
          sourceDir: './android',
          manifestPath: 'src/main/AndroidManifest.xml',
          packageImportPath: 'import com.selfxyz.selfSDK.RNPassportReaderPackage;',
          packageInstance: 'new RNPassportReaderPackage()',
        },
      },
    },
  },
  project: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
    },
  },
};
