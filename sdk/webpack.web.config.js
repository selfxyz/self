const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.web.ts', // Updated entry point
  output: {
    filename: 'bundle.web.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      bufferutil: false,
      'utf-8-validate': false,
      debug: require.resolve('debug'),
    },
  },
  target: 'web',
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    'lottie-react': 'lottie-react',
  },
};
