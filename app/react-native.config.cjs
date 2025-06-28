module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts'],
  dependencies: {
    'react-native-app-auth': {
      platforms: {
        ios: null, // Android only
      },
    },
  },
};
