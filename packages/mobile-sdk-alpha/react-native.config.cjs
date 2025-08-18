module.exports = {
  dependencies: {
    '@selfxyz/mobile-sdk-alpha': {
      platforms: {
        ios: {
          sourceDir: './ios',
          podspecPath: './mobile-sdk-alpha.podspec',
        },
      },
    },
  },
};
