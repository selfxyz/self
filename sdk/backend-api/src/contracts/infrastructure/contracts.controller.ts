import Elysia, { t } from 'elysia';
import { ProofVerifier } from '../../contracts/application/proofVerifier';
import { RegistryContract } from '../../contracts/application/registryContract';
import { getChain } from '../../contracts/application/chains';
import { getDscCommitmentEvents } from '../application/getEvents';
import { MerkleTreeService } from '../application/tree-reader/leanImtService';
import { getContractInstanceRoot } from '../application/tree-reader/getTree';
import { getCscaTree } from '../application/tree-reader/cscaTreeService';

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
  ).post(
    'update-csca-root',
    async (request) => {
      try {
        const { root } = request.body;
        const registryContract = new RegistryContract(
          getChain(process.env.NETWORK as string),
          process.env.PRIVATE_KEY as `0x${string}`,
          process.env.RPC_URL as string
        );
        const tx = await registryContract.updateCscaRoot(BigInt(root));
        return {
          status: "success",
          data: [tx.hash],
        };
      } catch (error) {
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      body: t.Object({
        root: t.String(),
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
        tags: ['CSCA'],
        summary: 'Update CSCA root in registry contract',
        description: 'Update the CSCA root in registry contract',
      },
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
    'verify-vc-and-disclose-proof',
    async (request) => {
      try {
        const registryContract = new RegistryContract(
          getChain(process.env.NETWORK as string),
          process.env.PRIVATE_KEY as `0x${string}`,
          process.env.RPC_URL as string
        );

        const identityCommitmentRoot = await registryContract.getIdentityCommitmentMerkleRoot();
        const ofacRoot = await registryContract.getOfacRoot();

        const { proof, publicSignals } = request.body;

        const proofVerifier = new ProofVerifier(
          process.env.OFAC_ENABLED === "true",
          process.env.OLDER_THAN_ENABLED === "true",
          process.env.EXCLUDED_COUNTRIES_ENABLED === "true",
          ofacRoot,
          process.env.OLDER_THAN || "18",
          (process.env.EXCLUDED_COUNTRIES || "USA,IRN,CHN").split(','),
          identityCommitmentRoot,
          {}
        );

        await proofVerifier.verifyVcAndDiscloseProof(proof, publicSignals);

        return {
          status: "success",
          data: ["Valid VC and disclose proof"],
        };
      } catch (error) {
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      body: t.Object({
        proof: t.Any(),
        publicSignals: t.Any(),
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
        summary: 'Verify a VC and disclose a proof',
        description: 'Verify a VC and disclose a proof',
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
  );
