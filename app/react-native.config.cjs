module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts'],
  dependencies: {
    'react-native-credentials-manager': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-credentials-manager/android',
          packageImportPath:
            'com.credentialsmanager.RNCredentialsManagerPackage',
        },
        ios: null, // disable iOS platform, Android only
      },
    },
  },
};
