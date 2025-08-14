import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Global ignores for files that should stay
  ignore: [
    // Documentation and examples
    '**/docs/**',
    '**/examples/**',

    // Configuration files
    'react-native.config.cjs',
    '**/.eslintrc.*',
    '**/metro.config.*',
    '**/babel.config.*',
    '**/jest.config.*',
    '**/tsconfig*.json',

    // Build and deployment scripts
    'scripts/**',
    'fastlane/**',

    // Native platform files
    'app/android/**',
    'app/ios/**',

    // Web build artifacts
    'app/web/**',

    // Test setup files
    '**/__setup__/**',
    '**/__mocks__/**',

    // Test files (often appear unused but are run by test runners)
    '**/*.test.ts',
    '**/*.test.js',
    'tests/**',

    // Utility files that may be used dynamically
    '**/loader.ts',
    '**/cryptoLoader.ts',
    '**/version.cjs',
  ],

  // Global dependency ignores
  ignoreDependencies: [
    // CLI tools and global utilities
    'gitleaks',
    'husky',
    'patch-package',
    'postinstall-postinstall',

    // Platform-specific dependencies (may not be detected)
    '@react-native-community/cli',
    '@react-native/gradle-plugin',

    // Type-only dependencies
    '@types/*',

    // Build tools that may not show usage
    'tsup',
    'tsx',
    'ts-node',
  ],

  // Workspace-specific configurations
  workspaces: {
    'app': {
      entry: [
        'index.js',
        'web/main.tsx'
      ],
      ignore: [
        // React Native config files
        'declarations.d.ts',
        'tamagui.config.ts',

        // Test utilities
        'src/mocks/**',
        'src/utils/testingUtils.ts',
      ],

      ignoreDependencies: [
        // Platform-specific animations
        '@tamagui/animations-css',
        '@tamagui/animations-react-native',

        // Web-specific dependencies
        'react-native-web',
        'react-native-svg-web',

        // Development tools
        'expo-modules-core',
        'lottie-react',
      ],
    },

    'circuits': {
      ignore: [
        // Test files (circuits are tested but files may appear unused)
        'tests/**',
      ],

      ignoreDependencies: [
        // Circom ecosystem (usage may not be detected)
        'circom*',
        '@zk-email/*',
        '@zk-kit/*',
        'snarkjs',
        'circomlibjs',
      ],
    },

    'contracts': {
      ignore: [
        // Deployment and testing infrastructure
        'ignition/**',
        'scripts/**',
        'test/**',
      ],

      ignoreDependencies: [
        // Hardhat ecosystem
        '@nomiclabs/*',
        '@nomicfoundation/*',
        'hardhat*',

        // Testing utilities
        'mocha',
        'chai*',

        // Contract dependencies
        '@openzeppelin/*',
        'snarkjs',
      ],
    },

    'common': {
      ignoreDependencies: [
        // May be used in re-exported modules
        'axios',
        'buffer',
        'elliptic',
        'jsrsasign',
        'node-forge',
      ],
    },

    'sdk/core': {
      ignoreDependencies: [
        // Core crypto libraries
        'js-sha*',
        'node-forge',
        'poseidon-lite',
        'uuid',
      ],
    },

    'sdk/qrcode': {
      ignoreDependencies: [
        // QR code crypto dependencies
        'js-sha*',
        'node-forge',
        'poseidon-lite',
      ],
    },
  },
};

export default config;
