const { getDefaultConfig } = require('@tamagui/build/config');

module.exports = (async () => {
  const config = await getDefaultConfig(`${__dirname}/src`);

  return {
    ...config,
    transformer: {
      ...config.transformer,
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
    },
    resolver: {
      ...config.resolver,
      assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...config.resolver.sourceExts, 'svg'],
    },
  };
})();
