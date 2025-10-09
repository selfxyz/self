export const sigAlgs = [
  { sigAlg: 'rsa', hashFunction: 'sha1', domainParameter: '65537', keyLength: '2048' }, // sha1_rsa_65537_4096
  // { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '130689', keyLength: '4096' }, // sha256_rsa_130689_4096
  // { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '122125', keyLength: '4096' }, // sha256_rsa_122125_4096
  // { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '107903', keyLength: '4096' }, // sha256_rsa_107903_4096
  // { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '56611', keyLength: '4096' }, // sha256_rsa_56611_4096
];

export const fullSigAlgs = [
  // RSA
  { sigAlg: 'rsa', hashFunction: 'sha1', domainParameter: '65537', keyLength: '2048' }, // sha1_rsa_65537_4096
  { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '65537', keyLength: '2048' }, // sha256_rsa_65537_4096
  { sigAlg: 'rsa', hashFunction: 'sha512', domainParameter: '65537', keyLength: '2048' }, // sha384_rsa_65537_4096
  // RSA-PSS
  {
    sigAlg: 'rsapss',
    hashFunction: 'sha256',
    saltLen: '32',
    domainParameter: '65537',
    keyLength: '3072',
  },
  // {
  //   sigAlg: 'rsapss',
  //   hashFunction: 'sha256',
  //   saltLen: '32',
  //   domainParameter: '65537',
  //   keyLength: '4096',
  // }, // DSC signed by CSCA using dsc_sha256_rsapss_65537_32_2048.circom, which was removed because not needed.
  // TODO: sign the DSC with a new CSCA
  {
    sigAlg: 'rsapss',
    hashFunction: 'sha512',
    saltLen: '64',
    domainParameter: '65537',
    keyLength: '4096',
  },
  {
    sigAlg: 'rsapss',
    hashFunction: 'sha256',
    saltLen: '32',
    domainParameter: '3',
    keyLength: '3072',
  },
  {
    sigAlg: 'rsapss',
    hashFunction: 'sha384',
    saltLen: '48',
    domainParameter: '65537',
    keyLength: '3072',
  },
  //ECDSA
  //brainpool
  { sigAlg: 'ecdsa', hashFunction: 'sha1', domainParameter: 'brainpoolP256r1', keyLength: '256' },
  { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'brainpoolP256r1', keyLength: '256' },
  { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'brainpoolP384r1', keyLength: '384' },
  { sigAlg: 'ecdsa', hashFunction: 'sha384', domainParameter: 'brainpoolP384r1', keyLength: '384' },
  { sigAlg: 'ecdsa', hashFunction: 'sha384', domainParameter: 'brainpoolP512r1', keyLength: '512' },
  { sigAlg: 'ecdsa', hashFunction: 'sha512', domainParameter: 'brainpoolP512r1', keyLength: '512' },
  //secp
  { sigAlg: 'ecdsa', hashFunction: 'sha1', domainParameter: 'secp256r1', keyLength: '256' },
  { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'secp256r1', keyLength: '256' },
  { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'secp384r1', keyLength: '384' },
  { sigAlg: 'ecdsa', hashFunction: 'sha384', domainParameter: 'secp384r1', keyLength: '384' },
  { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'secp521r1', keyLength: '521' },
  { sigAlg: 'ecdsa', hashFunction: 'sha512', domainParameter: 'secp521r1', keyLength: '521' },
];
