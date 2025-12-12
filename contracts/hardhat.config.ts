import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import dotenv from "dotenv";
dotenv.config();
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-ignition-ethers";
import "solidity-coverage";
import "hardhat-gas-reporter";

// Import custom upgrade tasks
import "./tasks/upgrade";

// Use a dummy private key for CI/local development (not used for actual deployments)
const DUMMY_PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001";
const PRIVATE_KEY = process.env.PRIVATE_KEY || DUMMY_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  contractSizer: {
    runOnCompile: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
      },
    },
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
      accounts: [PRIVATE_KEY],
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.public.blastapi.io",
      accounts: [PRIVATE_KEY],
    },
    celo: {
      chainId: 42220,
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      accounts: [PRIVATE_KEY],
    },
    "celo-sepolia": {
      chainId: 11142220,
      url: process.env.CELO_SEPOLIA_RPC_URL || "https://rpc.ankr.com/celo_sepolia",
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY as string,
    // apiKey: {
    //   "celo-sepolia": process.env.ETHERSCAN_API_KEY as string,
    // },
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=42220",
          browserURL: "https://celoscan.io/",
        },
      },
      {
        network: "celo-sepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://celo-sepolia.blockscout.com/api",
          browserURL: "https://celo-sepolia.blockscout.com",
        },
      },
    ],
  },
};

export default config;
