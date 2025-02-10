export const registryAbi = [
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
      "name": "HUB_NOT_SET",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInitialization",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LeafAlreadyExists",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LeafCannotBeZero",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LeafDoesNotExist",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LeafGreaterThanSnarkScalarField",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotInitializing",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ONLY_HUB_CAN_ACCESS",
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
      "name": "REGISTERED_COMMITMENT",
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
      "inputs": [],
      "name": "WrongSiblingNodes",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "nullifier",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtIndex",
          "type": "uint256"
        }
      ],
      "name": "CommitmentRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "cscaRoot",
          "type": "uint256"
        }
      ],
      "name": "CscaRootUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "nullifier",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtIndex",
          "type": "uint256"
        }
      ],
      "name": "DevCommitmentRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "DevCommitmentRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "newLeaf",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "DevCommitmentUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtIndex",
          "type": "uint256"
        }
      ],
      "name": "DevDscKeyCommitmentRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        }
      ],
      "name": "DevDscKeyCommitmentRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "state",
          "type": "bool"
        }
      ],
      "name": "DevDscKeyCommitmentStateChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "newLeaf",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        }
      ],
      "name": "DevDscKeyCommitmentUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "nullifier",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "state",
          "type": "bool"
        }
      ],
      "name": "DevNullifierStateChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtRoot",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "imtIndex",
          "type": "uint256"
        }
      ],
      "name": "DscKeyCommitmentRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "hub",
          "type": "address"
        }
      ],
      "name": "HubUpdated",
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
          "indexed": false,
          "internalType": "uint256",
          "name": "ofacRoot",
          "type": "uint256"
        }
      ],
      "name": "OfacRootUpdated",
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
          "internalType": "address",
          "name": "hub",
          "type": "address"
        }
      ],
      "name": "RegistryInitialized",
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
          "internalType": "uint256",
          "name": "root",
          "type": "uint256"
        }
      ],
      "name": "checkCscaRoot",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "root",
          "type": "uint256"
        }
      ],
      "name": "checkDscKeyCommitmentMerkleRoot",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "root",
          "type": "uint256"
        }
      ],
      "name": "checkIdentityCommitmentRoot",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "root",
          "type": "uint256"
        }
      ],
      "name": "checkOfacRoot",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "dscCommitment",
          "type": "uint256"
        }
      ],
      "name": "devAddDscKeyCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "nullifier",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        }
      ],
      "name": "devAddIdentityCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "dscCommitment",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "state",
          "type": "bool"
        }
      ],
      "name": "devChangeDscKeyCommitmentState",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "nullifier",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "state",
          "type": "bool"
        }
      ],
      "name": "devChangeNullifierState",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "siblingNodes",
          "type": "uint256[]"
        }
      ],
      "name": "devRemoveCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "siblingNodes",
          "type": "uint256[]"
        }
      ],
      "name": "devRemoveDscKeyCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "newLeaf",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "siblingNodes",
          "type": "uint256[]"
        }
      ],
      "name": "devUpdateCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "oldLeaf",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "newLeaf",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "siblingNodes",
          "type": "uint256[]"
        }
      ],
      "name": "devUpdateDscKeyCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCscaRoot",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        }
      ],
      "name": "getDscKeyCommitmentIndex",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getDscKeyCommitmentMerkleRoot",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getDscKeyCommitmentTreeSize",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        }
      ],
      "name": "getIdentityCommitmentIndex",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getIdentityCommitmentMerkleRoot",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getIdentityCommitmentMerkleTreeSize",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getOfacRoot",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "hub",
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
          "name": "_hub",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        }
      ],
      "name": "isRegisteredDscKeyCommitment",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "nullifier",
          "type": "uint256"
        }
      ],
      "name": "nullifiers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
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
          "internalType": "bytes32",
          "name": "attestationId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "nullifier",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "commitment",
          "type": "uint256"
        }
      ],
      "name": "registerCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "dscCommitment",
          "type": "uint256"
        }
      ],
      "name": "registerDscKeyCommitment",
      "outputs": [],
      "stateMutability": "nonpayable",
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
          "name": "root",
          "type": "uint256"
        }
      ],
      "name": "rootTimestamps",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
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
          "name": "newCscaRoot",
          "type": "uint256"
        }
      ],
      "name": "updateCscaRoot",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newHubAddress",
          "type": "address"
        }
      ],
      "name": "updateHub",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newOfacRoot",
          "type": "uint256"
        }
      ],
      "name": "updateOfacRoot",
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
    }
  ];