import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-ignition-ethers";

const { PKEY, OPTIMISM_SEPOLIA_RPC_URL } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true
        }
      },

      metadata: {
        bytecodeHash: "none"
      },
      viaIR: false,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: "https://eth-goerli.public.blastapi.io",
      accounts: [process.env.PKEY as string],
    },
    polygon: {
      url: "https://polygon.llamarpc.com",
      accounts: [process.env.PKEY as string],
    },
    mumbai: {
      url: "https://polygon-mumbai-bor.publicnode.com",
      accounts: [process.env.PKEY as string],
    },
    sepolia: {
      url: "https://eth-sepolia.public.blastapi.io",
      accounts: [process.env.PKEY as string],
      gasPrice: 6 * 10 ** 9, // Optimism uses a different gas mechanism, set to 0 for automatic handling
    },
    optimismSepolia: {
      url: "https://opt-sepolia.g.alchemy.com/v2/t30F1rBnOskwo0M0Q4Re6bXQHQPpW_Sz",
      accounts: [`0x${PKEY}`],
      gasPrice: 5 * 10 ** 9, // Optimism uses a different gas mechanism, set to 0 for automatic handling
    }
  },
  etherscan: {
    apiKey: "GSZW9CN933WI4N3ZMQF9XCX9R6AC2H9IZF",
  }
};

export default config;