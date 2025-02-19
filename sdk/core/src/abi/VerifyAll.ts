export const verifyAllAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'hub',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'registry',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [],
    name: '_hub',
    outputs: [
      {
        internalType: 'contract IIdentityVerificationHubV1',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: '_registry',
    outputs: [
      {
        internalType: 'contract IIdentityRegistryV1',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'hub',
        type: 'address',
      },
    ],
    name: 'setHub',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'registry',
        type: 'address',
      },
    ],
    name: 'setRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'targetRootTimestamp',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'bool',
            name: 'olderThanEnabled',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'olderThan',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'forbiddenCountriesEnabled',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'forbiddenCountriesListPacked',
            type: 'uint256',
          },
          {
            internalType: 'bool[3]',
            name: 'ofacEnabled',
            type: 'bool[3]',
          },
          {
            components: [
              {
                internalType: 'uint256[2]',
                name: 'a',
                type: 'uint256[2]',
              },
              {
                internalType: 'uint256[2][2]',
                name: 'b',
                type: 'uint256[2][2]',
              },
              {
                internalType: 'uint256[2]',
                name: 'c',
                type: 'uint256[2]',
              },
              {
                internalType: 'uint256[18]',
                name: 'pubSignals',
                type: 'uint256[18]',
              },
            ],
            internalType: 'struct IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof',
            name: 'vcAndDiscloseProof',
            type: 'tuple',
          },
        ],
        internalType: 'struct IIdentityVerificationHubV1.VcAndDiscloseHubProof',
        name: 'proof',
        type: 'tuple',
      },
      {
        internalType: 'enum IIdentityVerificationHubV1.RevealedDataType[]',
        name: 'types',
        type: 'uint8[]',
      },
    ],
    name: 'verifyAll',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'issuingState',
            type: 'string',
          },
          {
            internalType: 'string[]',
            name: 'name',
            type: 'string[]',
          },
          {
            internalType: 'string',
            name: 'passportNumber',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'nationality',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'dateOfBirth',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'gender',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'expiryDate',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'olderThan',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'passportNoOfac',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nameAndDobOfac',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nameAndYobOfac',
            type: 'uint256',
          },
        ],
        internalType: 'struct IIdentityVerificationHubV1.ReadableRevealedData',
        name: '',
        type: 'tuple',
      },
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
