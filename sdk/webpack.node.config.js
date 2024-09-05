const path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/index.node.ts',
    output: {
        filename: 'bundle.node.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            "bufferutil": false,
            "utf-8-validate": false,
            "debug": require.resolve('debug')
        }
    },

    target: 'node',
};