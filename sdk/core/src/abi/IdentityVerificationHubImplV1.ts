export const hubV1Abi = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'target',
        type: 'address',
      },
    ],
    name: 'AddressEmptyCode',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ConfigNotSet',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CrossChainIsNotSupportedYet',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CurrentDateNotInValidRange',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'ERC1967InvalidImplementation',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ERC1967NonPayable',
    type: 'error',
  },
  {
    inputs: [],
    name: 'FailedCall',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InputTooShort',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAttestationId',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidCscaRoot',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidDateDigit',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidDateLength',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidDayRange',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidDscCommitmentRoot',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidDscProof',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidFieldElement',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidMonthRange',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidNameAndDobOfacRoot',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidNameAndYobOfacRoot',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidPassportNoOfacRoot',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidProof',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidScope',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidUserIdentifier',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidYearRange',
    type: 'error',
  },
  {
    inputs: [],
    name: 'LENGTH_MISMATCH',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NullifierAlreadyUsed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OlderThanCheckFailed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PassportCommitmentAlreadyRegistered',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PassportCommitmentNotRegistered',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PassportNumberOfacCheckFailed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'RootNotInTree',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ScopeCheckFailed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UserIdentifierCheckFailed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UserIdentifierMismatch',
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
    inputs: [
      {
        internalType: 'address',
        name: 'registryAddress',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'vcAndDiscloseCircuitVerifierAddress',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'registerCircuitVerifierIds',
        type: 'uint256[]',
      },
      {
        internalType: 'address[]',
        name: 'registerCircuitVerifierAddresses',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'dscCircuitVerifierIds',
        type: 'uint256[]',
      },
      {
        internalType: 'address[]',
        name: 'dscCircuitVerifierAddresses',
        type: 'address[]',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'dscCircuitVerifierId',
        type: 'uint256',
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
            internalType: 'uint256[2]',
            name: 'pubSignals',
            type: 'uint256[2]',
          },
        ],
        internalType: 'struct IDscCircuitVerifier.DscCircuitProof',
        name: 'dscCircuitProof',
        type: 'tuple',
      },
    ],
    name: 'registerDscKeyCommitment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'registerCircuitVerifierId',
        type: 'uint256',
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
            internalType: 'uint256[3]',
            name: 'pubSignals',
            type: 'uint256[3]',
          },
        ],
        internalType: 'struct IRegisterCircuitVerifier.RegisterCircuitProof',
        name: 'registerCircuitProof',
        type: 'tuple',
      },
    ],
    name: 'registerPassportCommitment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'registry',
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
    inputs: [
      {
        internalType: 'uint256',
        name: 'typeId',
        type: 'uint256',
      },
    ],
    name: 'sigTypeToDscCircuitVerifiers',
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
    inputs: [
      {
        internalType: 'uint256',
        name: 'typeId',
        type: 'uint256',
      },
    ],
    name: 'sigTypeToRegisterCircuitVerifiers',
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
    name: 'vcAndDiscloseCircuitVerifier',
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
    inputs: [
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
            internalType: 'uint256[4]',
            name: 'forbiddenCountriesListPacked',
            type: 'uint256[4]',
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
                internalType: 'uint256[21]',
                name: 'pubSignals',
                type: 'uint256[21]',
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
    ],
    name: 'verifyVcAndDisclose',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'attestationId',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'scope',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'userIdentifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nullifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'identityCommitmentRoot',
            type: 'uint256',
          },
          {
            internalType: 'uint256[3]',
            name: 'revealedDataPacked',
            type: 'uint256[3]',
          },
          {
            internalType: 'uint256[4]',
            name: 'forbiddenCountriesListPacked',
            type: 'uint256[4]',
          },
        ],
        internalType: 'struct IIdentityVerificationHubV1.VcAndDiscloseVerificationResult',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
