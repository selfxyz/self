// Shim configurations for @selfxyz/core
export const shimConfigs = [
  {
    shimPath: 'SelfBackendVerifier',
    targetPath: '../esm/src/SelfBackendVerifier.js',
    name: 'SelfBackendVerifier',
  },
  { shimPath: 'errors', targetPath: '../esm/src/errors.js', name: 'errors' },
  {
    shimPath: 'store/DefaultConfigStore',
    targetPath: '../../esm/src/store/DefaultConfigStore.js',
    name: 'store/DefaultConfigStore',
  },
  {
    shimPath: 'store/InMemoryConfigStore',
    targetPath: '../../esm/src/store/InMemoryConfigStore.js',
    name: 'store/InMemoryConfigStore',
  },
  {
    shimPath: 'store/interface',
    targetPath: '../../esm/src/store/interface.js',
    name: 'store/interface',
  },
  { shimPath: 'types', targetPath: '../esm/src/types/types.js', name: 'types' },
  { shimPath: 'utils', targetPath: '../esm/src/utils/utils.js', name: 'utils' },
  {
    shimPath: 'utils/constants',
    targetPath: '../../esm/src/utils/constants.js',
    name: 'utils/constants',
  },
  { shimPath: 'utils/hash', targetPath: '../../esm/src/utils/hash.js', name: 'utils/hash' },
  { shimPath: 'utils/id', targetPath: '../../esm/src/utils/id.js', name: 'utils/id' },
  { shimPath: 'utils/proof', targetPath: '../../esm/src/utils/proof.js', name: 'utils/proof' },
  {
    shimPath: 'typechain-types',
    targetPath: '../esm/src/typechain-types/index.js',
    name: 'typechain-types',
  },
];
