export const hubAbi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "target",
          "type": "address"
        }
      ],
      "name": "AddressEmptyCode",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CURRENT_DATE_NOT_IN_VALID_RANGE",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "ERC1967InvalidImplementation",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ERC1967NonPayable",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "FailedCall",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INSUFFICIENT_CHARCODE_LEN",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_COMMITMENT_ROOT",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_CSCA_ROOT",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_DSC_PROOF",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_FORBIDDEN_COUNTRIES",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_OFAC",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_OFAC_ROOT",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_OLDER_THAN",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_REGISTER_PROOF",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_REVEALED_DATA_TYPE",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "INVALID_VC_AND_DISCLOSE_PROOF",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidAsciiCode",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidDateLength",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInitialization",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LENGTH_MISMATCH",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NO_VERIFIER_SET",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotInitializing",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "UUPSUnauthorizedCallContext",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "slot",
          "type": "bytes32"
        }
      ],
      "name": "UUPSUnsupportedProxiableUUID",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "typeId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "verifier",
          "type": "address"
        }
      ],
      "name": "DscCircuitVerifierUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "registry",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "vcAndDiscloseCircuitVerifier",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "registerCircuitVerifierIds",
          "type": "uint256[]"
        },
        {
          "indexed": false,
          "internalType": "address[]",
          "name": "registerCircuitVerifiers",
          "type": "address[]"
        },
        {
          "indexed": false,
          "internalType": "uint256[]",
          "name": "dscCircuitVerifierIds",
          "type": "uint256[]"
        },
        {
          "indexed": false,
          "internalType": "address[]",
          "name": "dscCircuitVerifiers",
          "type": "address[]"
        }
      ],
      "name": "HubInitialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "version",
          "type": "uint64"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "typeId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "verifier",
          "type": "address"
        }
      ],
      "name": "RegisterCircuitVerifierUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "registry",
          "type": "address"
        }
      ],
      "name": "RegistryUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "implementation",
          "type": "address"
        }
      ],
      "name": "Upgraded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "vcAndDiscloseCircuitVerifier",
          "type": "address"
        }
      ],
      "name": "VcAndDiscloseCircuitUpdated",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "UPGRADE_INTERFACE_VERSION",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "acceptOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[]",
          "name": "typeIds",
          "type": "uint256[]"
        },
        {
          "internalType": "address[]",
          "name": "verifierAddresses",
          "type": "address[]"
        }
      ],
      "name": "batchUpdateDscCircuitVerifiers",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[]",
          "name": "typeIds",
          "type": "uint256[]"
        },
        {
          "internalType": "address[]",
          "name": "verifierAddresses",
          "type": "address[]"
        }
      ],
      "name": "batchUpdateRegisterCircuitVerifiers",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "forbiddenCountriesListPacked",
          "type": "uint256"
        }
      ],
      "name": "getReadableForbiddenCountries",
      "outputs": [
        {
          "internalType": "string[10]",
          "name": "",
          "type": "string[10]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[3]",
          "name": "revealedDataPacked",
          "type": "uint256[3]"
        },
        {
          "internalType": "enum IIdentityVerificationHubV1.RevealedDataType[]",
          "name": "types",
          "type": "uint8[]"
        }
      ],
      "name": "getReadableRevealedData",
      "outputs": [
        {
          "components": [
            {
              "internalType": "string",
              "name": "issuingState",
              "type": "string"
            },
            {
              "internalType": "string[]",
              "name": "name",
              "type": "string[]"
            },
            {
              "internalType": "string",
              "name": "passportNumber",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "nationality",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "dateOfBirth",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "gender",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "expiryDate",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "olderThan",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ofac",
              "type": "uint256"
            }
          ],
          "internalType": "struct IIdentityVerificationHubV1.ReadableRevealedData",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "registryAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "vcAndDiscloseCircuitVerifierAddress",
          "type": "address"
        },
        {
          "internalType": "uint256[]",
          "name": "registerCircuitVerifierIds",
          "type": "uint256[]"
        },
        {
          "internalType": "address[]",
          "name": "registerCircuitVerifierAddresses",
          "type": "address[]"
        },
        {
          "internalType": "uint256[]",
          "name": "dscCircuitVerifierIds",
          "type": "uint256[]"
        },
        {
          "internalType": "address[]",
          "name": "dscCircuitVerifierAddresses",
          "type": "address[]"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pendingOwner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proxiableUUID",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "dscCircuitVerifierId",
          "type": "uint256"
        },
        {
          "components": [
            {
              "internalType": "uint256[2]",
              "name": "a",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[2][2]",
              "name": "b",
              "type": "uint256[2][2]"
            },
            {
              "internalType": "uint256[2]",
              "name": "c",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[2]",
              "name": "pubSignals",
              "type": "uint256[2]"
            }
          ],
          "internalType": "struct IDscCircuitVerifier.DscCircuitProof",
          "name": "dscCircuitProof",
          "type": "tuple"
        }
      ],
      "name": "registerDscKeyCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "registerCircuitVerifierId",
          "type": "uint256"
        },
        {
          "components": [
            {
              "internalType": "uint256[2]",
              "name": "a",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[2][2]",
              "name": "b",
              "type": "uint256[2][2]"
            },
            {
              "internalType": "uint256[2]",
              "name": "c",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[3]",
              "name": "pubSignals",
              "type": "uint256[3]"
            }
          ],
          "internalType": "struct IRegisterCircuitVerifier.RegisterCircuitProof",
          "name": "registerCircuitProof",
          "type": "tuple"
        }
      ],
      "name": "registerPassportCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "registry",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "typeId",
          "type": "uint256"
        }
      ],
      "name": "sigTypeToDscCircuitVerifiers",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "typeId",
          "type": "uint256"
        }
      ],
      "name": "sigTypeToRegisterCircuitVerifiers",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "typeId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "verifierAddress",
          "type": "address"
        }
      ],
      "name": "updateDscVerifier",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "typeId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "verifierAddress",
          "type": "address"
        }
      ],
      "name": "updateRegisterCircuitVerifier",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "registryAddress",
          "type": "address"
        }
      ],
      "name": "updateRegistry",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "vcAndDiscloseCircuitVerifierAddress",
          "type": "address"
        }
      ],
      "name": "updateVcAndDiscloseCircuit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newImplementation",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "upgradeToAndCall",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "vcAndDiscloseCircuitVerifier",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "bool",
              "name": "olderThanEnabled",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "olderThan",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "forbiddenCountriesEnabled",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "forbiddenCountriesListPacked",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "ofacEnabled",
              "type": "bool"
            },
            {
              "components": [
                {
                  "internalType": "uint256[2]",
                  "name": "a",
                  "type": "uint256[2]"
                },
                {
                  "internalType": "uint256[2][2]",
                  "name": "b",
                  "type": "uint256[2][2]"
                },
                {
                  "internalType": "uint256[2]",
                  "name": "c",
                  "type": "uint256[2]"
                },
                {
                  "internalType": "uint256[16]",
                  "name": "pubSignals",
                  "type": "uint256[16]"
                }
              ],
              "internalType": "struct IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof",
              "name": "vcAndDiscloseProof",
              "type": "tuple"
            }
          ],
          "internalType": "struct IIdentityVerificationHubV1.VcAndDiscloseHubProof",
          "name": "proof",
          "type": "tuple"
        }
      ],
      "name": "verifyVcAndDisclose",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "attestationId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "scope",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "userIdentifier",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nullifier",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "identityCommitmentRoot",
              "type": "uint256"
            },
            {
              "internalType": "uint256[3]",
              "name": "revealedDataPacked",
              "type": "uint256[3]"
            },
            {
              "internalType": "uint256",
              "name": "forbiddenCountriesListPacked",
              "type": "uint256"
            }
          ],
          "internalType": "struct IIdentityVerificationHubV1.VcAndDiscloseVerificationResult",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];