import Elysia, { t } from 'elysia';
import { RegistryContract } from '../../contracts/application/registryContract';
import { HubContract } from '../application/hubContract';
import { getChain } from '../../contracts/application/chains';
import { getDscCommitmentEvents } from '../application/getEvents';
import { MerkleTreeService } from '../application/tree-reader/leanImtService';
import { getContractInstanceRoot } from '../application/tree-reader/getTree';
import { getCscaTree } from '../application/tree-reader/cscaTreeService';
import { getCSCAFromSKIApi } from '../application/skiPem';
import { PCR0Contract } from '../application/pcr0/pcr0';

const dscTree = new MerkleTreeService('dsc');
const commitmentTree = new MerkleTreeService('identity');

export const ContractsController = new Elysia()
  .get(
    'identity-commitment-root',
    async () => {
      try {
        const identityCommitmentRoot = await getContractInstanceRoot('identity');
        return {
          status: 'success',
          data: [identityCommitmentRoot.toString()],
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Identity'],
        summary: 'Get identity commitment root in registry contract',
        description: 'Retrieve the identity commitment root in registry contract',
      },
    },
  )
  .post(
    'update-csca-root',
    async ({ body, set }) => {
      try {
        if (!body.root) {
          set.status = 400;
          return {
            status: "error",
            message: "Root parameter is required"
          };
        }

        const registryContract = new RegistryContract(
          getChain(process.env.NETWORK as string),
          process.env.PRIVATE_KEY as `0x${string}`,
          process.env.RPC_URL as string
        );
        console.log("body.root", body.root);

        const tx = await registryContract.updateCscaRoot(BigInt(body.root));
        return {
          status: "success",
          data: [tx.hash]
        };
      } catch (error) {
        set.status = 500;
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        };
      }
    },
    {
      body: t.Object({
        root: t.String()
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String())
        }),
        500: t.Object({
          status: t.String(),
          message: t.String()
        })
      },
      detail: {
        tags: ['CSCA'],
        summary: 'Update CSCA root in registry contract',
        description: 'Update the CSCA root in registry contract'
      }
    }
  )
  .get(
    'dsc-key-commitment-root',
    async () => {
      const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const dscKeyCommitmentRoot = await registryContract.getDscKeyCommitmentMerkleRoot();
      return {
        status: 'success',
        data: [dscKeyCommitmentRoot.toString()],
      };
    },
    {
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['DSC'],
        summary: 'Get DSC key commitment root in registry contract',
        description: 'Retrieve the DSC key commitment root in registry contract',
      },
    },
  )
  .post(
    'transfer-ownership',
    async (request) => {
      const { newOwner } = request.body;
      const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const tx = await registryContract.transferOwnership(newOwner as `0x${string}`);
      return {
        status: "success",
        data: [tx.hash],
      };
    },
    {
      body: t.Object({
        newOwner: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Contracts'],
        summary: 'Transfer ownership of the registry contract',
        description: 'Transfer ownership of the registry contract',
      },
    },
  )
  .post(
    'accept-ownership',
    async () => {
      const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const tx = await registryContract.acceptOwnership();
      return {
        status: "success",
        data: [tx.hash],
      };
    },
    {
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Contracts'],
        summary: 'Accept ownership of the registry contract',
        description: 'Accept ownership of the registry contract',
      },
    },
  )

  .post(
    'updateHub',
    async (request) => {
      const { address } = request.body;
      const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const tx = await registryContract.updateHub(address as `0x${string}`);
      return {
        status: "success",
        data: [tx.hash],
      };
    },
    {
      body: t.Object({
        address: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Contracts'],
        summary: 'update hub address in registry',
        description: 'update hub address in registry',
      },
    },
  )
  .post(
    'dev-add-dsc-key-commitment',
    async (request) => {
      const { dscCommitment } = request.body;
      const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const tx = await registryContract.devAddDscKeyCommitment(BigInt(dscCommitment));

      return {
        status: "success",
        data: [tx.hash],
      };
    },
    {
      body: t.Object({
        dscCommitment: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['DSC'],
        summary: 'Add DSC key commitment to registry contract as a dev role',
        description: 'Add DSC key commitment to registry contract as a dev role',
      },
    },
  )
  .post(
    'dev-add-identity-commitment',
    async (request) => {
      const { attestationId, nullifier, commitment } = request.body;
      const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const tx = await registryContract.devAddIdentityCommitment(attestationId, BigInt(nullifier), BigInt(commitment));

      return {
        status: "success",
        data: [tx.hash],
      };
    },
    {
      body: t.Object({
        attestationId: t.String(),
        nullifier: t.String(),
        commitment: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Identity'],
        summary: 'Add identity commitment to registry contract as a dev role',
        description: 'Add identity commitment to registry contract as a dev role',
      },
    },
  )
  .post(
    'is-nullifier-onchain',
    async (request) => {
      const { nullifier } = request.body;
      console.log("nullifier", nullifier);
      const registryContract = new RegistryContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const isNullifierOnchain = await registryContract.nullifiers(
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        nullifier
      );
      console.log("isNullifierOnchain", isNullifierOnchain);
      return {
        status: "success",
        data: isNullifierOnchain,
      };
    },
    {
      body: t.Object({
        nullifier: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Boolean(),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Nullifier'],
        summary: 'Check if a nullifier is onchain',
        description: 'Check if a nullifier is onchain',
      },
    },
  )
  .get(
    'sig-to-register',
    async ({ query }) => {
      const id = Number(query.id);
      const hubContract = new HubContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const address = await hubContract.sigTypeToRegisterCircuitVerifiers(id);
      return { status: 'success', data: address };
    },
    {
      query: t.Object({ id: t.String() }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.String(),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Hub'],
        summary: 'Get Register Circuit Verifier Address via Query',
        description: 'Retrieve the Register Circuit Verifier address by passing id as a query parameter.',
      },
    }
  )
  .get(
    'sig-to-dsc',
    async ({ query }) => {
      const id = Number(query.id);
      const hubContract = new HubContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const address = await hubContract.sigTypeToDscCircuitVerifiers(id);
      return { status: 'success', data: address };
    },
    {
      query: t.Object({ id: t.String() }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.String(),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Hub'],
        summary: 'Get DSC Circuit Verifier Address via Query',
        description: 'Retrieve the DSC Circuit Verifier address by passing id as a query parameter.',
      },
    }
  )
  .post(
    'updateRegistry',
    async (request) => {
      const { address } = request.body;
      const hubContract = new HubContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const tx = await hubContract.updateRegistry(address);

      return {
        status: "success",
        data: [tx.hash],
      };
    },
    {
      body: t.Object({
        address: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Hub'],
        summary: 'Add DSC key commitment to registry contract as a dev role',
        description: 'Add DSC key commitment to registry contract as a dev role',
      },
    },
  )
  .post(
    'updateVcAndDiscloseCircuit',
    async (request) => {
      const { address } = request.body;
      const hubContract = new HubContract(
        getChain(process.env.NETWORK as string),
        process.env.PRIVATE_KEY as `0x${string}`,
        process.env.RPC_URL as string
      );
      const tx = await hubContract.updateVcAndDiscloseCircuit(address);

      return {
        status: "success",
        data: [tx.hash],
      };
    },
    {
      body: t.Object({
        address: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String()),
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
        }),
      },
      detail: {
        tags: ['Hub'],
        summary: 'Add DSC key commitment to registry contract as a dev role',
        description: 'Add DSC key commitment to registry contract as a dev role',
      },
    },
  )
  .get(
    'dsc-commitment-tree',
    async () => {
      try {
        const tree = await dscTree.getTree();
        return {
          status: 'success',
          data: tree
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: null
        };
      }
    },
    {
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Any()
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
          data: t.Any()
        })
      },
      detail: {
        tags: ['DSC'],
        summary: 'Get DSC commitment Merkle tree',
        description: 'Retrieve the current state of the DSC commitment Merkle tree'
      }
    }
  )
  .get(
    'identity-commitment-tree',
    async () => {
      try {
        const tree = await commitmentTree.getTree();
        return {
          status: 'success',
          data: tree
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: null
        };
      }
    },
    {
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Any()
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
          data: t.Any()
        })
      },
      detail: {
        tags: ['Identity'],
        summary: 'Get identity commitment Merkle tree',
        description: 'Retrieve the current state of the identity commitment Merkle tree'
      }
    }
  )
  .get(
    'csca-tree',
    async () => {
      const tree = await getCscaTree();
      return {
        status: 'success',
        data: tree
      };
    },
    {
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Any()
        }),
        500: t.Object({
          status: t.String(),
          message: t.String(),
          data: t.Any()
        })
      },
      detail: {
        tags: ['CSCA'],
        summary: 'Get CSCA tree',
        description: 'Retrieve the current state of the CSCA tree'
      }
    }
  )
  .get(
    'csca-from-ski/:ski',
    async ({ params }) => {
      try {
        const response = getCSCAFromSKIApi(params.ski);
        if (!response.found) {
          return {
            status: 'error',
            message: response.result,
            data: undefined
          };
        }
        return {
          status: 'success',
          data: response.result,
          message: undefined
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: undefined
        };
      }
    },
    {
      params: t.Object({
        ski: t.String()
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Union([t.String(), t.Undefined()]),
          message: t.Union([t.String(), t.Undefined()])
        })
      },
      detail: {
        tags: ['CSCA'],
        summary: 'Get CSCA certificate from SKI',
        description: 'Retrieve the CSCA certificate using the provided Subject Key Identifier (SKI)'
      }
    }
  )
  .post(
    'pcr0/add',
    async ({ body, set }) => {
      try {
        let normalizedPCR0 = body.pcr0;
        if (!normalizedPCR0.startsWith("0x")) {
          normalizedPCR0 = "0x" + normalizedPCR0;
        }
        if (normalizedPCR0.length !== 2 + 96) {
          throw new Error(
            "Invalid PCR0 format: expected 0x-prefixed hex string with 96 characters (48 bytes)."
          );
        }

        const pcr0Contract = new PCR0Contract(
          getChain(process.env.NETWORK as string),
          process.env.PRIVATE_KEY as `0x${string}`,
          process.env.RPC_URL as string
        );
        const tx = await pcr0Contract.addPCR0(normalizedPCR0 as `0x${string}`);
        return {
          status: "success",
          data: [tx.hash]
        };
      } catch (error) {
        set.status = 500;
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        };
      }
    },
    {
      body: t.Object({
        pcr0: t.String()
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String())
        }),
        500: t.Object({
          status: t.String(),
          message: t.String()
        })
      },
      detail: {
        tags: ['PCR0'],
        summary: 'Add PCR0 measurement',
        description: 'Add a new PCR0 measurement to the contract'
      }
    }
  )
  .post(
    'pcr0/remove',
    async ({ body, set }) => {
      try {
        let normalizedPCR0 = body.pcr0;
        if (!normalizedPCR0.startsWith("0x")) {
          normalizedPCR0 = "0x" + normalizedPCR0;
        }
        if (normalizedPCR0.length !== 2 + 96) {
          throw new Error(
            "Invalid PCR0 format: expected 0x-prefixed hex string with 96 characters (48 bytes)."
          );
        }

        const pcr0Contract = new PCR0Contract(
          getChain(process.env.NETWORK as string),
          process.env.PRIVATE_KEY as `0x${string}`,
          process.env.RPC_URL as string
        );
        const tx = await pcr0Contract.removePCR0(normalizedPCR0 as `0x${string}`);
        return {
          status: "success",
          data: [tx.hash]
        };
      } catch (error) {
        set.status = 500;
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        };
      }
    },
    {
      body: t.Object({
        pcr0: t.String()
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String())
        }),
        500: t.Object({
          status: t.String(),
          message: t.String()
        })
      },
      detail: {
        tags: ['PCR0'],
        summary: 'Remove PCR0 measurement',
        description: 'Remove an existing PCR0 measurement from the contract'
      }
    }
  )
  .get(
    'pcr0/is-set/:pcr0',
    async ({ params, set }) => {
      try {
        let normalizedPCR0 = params.pcr0;
        if (!normalizedPCR0.startsWith("0x")) {
          normalizedPCR0 = "0x" + normalizedPCR0;
        }
        if (normalizedPCR0.length !== 2 + 96) {
          throw new Error(
            "Invalid PCR0 format: expected 0x-prefixed hex string with 96 characters (48 bytes)."
          );
        }

        const pcr0Contract = new PCR0Contract(
          getChain(process.env.NETWORK as string),
          process.env.PRIVATE_KEY as `0x${string}`,
          process.env.RPC_URL as string
        );
        const exists = await pcr0Contract.isPCR0Set(normalizedPCR0 as `0x${string}`);
        return {
          status: "success",
          data: [exists.toString()]
        };
      } catch (error) {
        set.status = 500;
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        };
      }
    },
    {
      params: t.Object({
        pcr0: t.String()
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String())
        }),
        500: t.Object({
          status: t.String(),
          message: t.String()
        })
      },
      detail: {
        tags: ['PCR0'],
        summary: 'Check if PCR0 measurement exists',
        description: 'Check if a specific PCR0 measurement is set in the contract'
      }
    }
  )
  .post(
    'pcr0/transfer-ownership',
    async ({ body, set }) => {
      try {
        let newOwner = body.newOwner;
        if (!newOwner.startsWith("0x")) {
          newOwner = "0x" + newOwner;
        }
        if (newOwner.length !== 42) {
          throw new Error(
            "Invalid newOwner format: expected 0x-prefixed Ethereum address (42 characters)."
          );
        }

        const pcr0Contract = new PCR0Contract(
          getChain(process.env.NETWORK as string),
          process.env.PRIVATE_KEY as `0x${string}`,
          process.env.RPC_URL as string
        );
        const tx = await pcr0Contract.transferOwnership(newOwner as `0x${string}`);
        return {
          status: "success",
          data: [tx.hash]
        };
      } catch (error) {
        set.status = 500;
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        };
      }
    },
    {
      body: t.Object({
        newOwner: t.String()
      }),
      response: {
        200: t.Object({
          status: t.String(),
          data: t.Array(t.String())
        }),
        500: t.Object({
          status: t.String(),
          message: t.String()
        })
      },
      detail: {
        tags: ['PCR0'],
        summary: 'Transfer PCR0 contract ownership',
        description: 'Transfer ownership of the PCR0 contract to a new address'
      }
    }
  )