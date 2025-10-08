import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config({
  path: process.env.CI ? ".env.test" : ".env",
});
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-ignition-ethers";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
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
        mnemonic: "test test test test test test test test test test test test",
        count: 20,
      },
    },
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
      accounts: [process.env.PRIVATE_KEY as string],
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.public.blastapi.io",
      accounts: [process.env.PRIVATE_KEY as string],
    },
    celo: {
      chainId: 42220,
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      accounts: [process.env.PRIVATE_KEY as string],
    },
    alfajores: {
      chainId: 44787,
      url: process.env.CELO_ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org",
      accounts: [process.env.PRIVATE_KEY as string],
    },
    "celo-sepolia": {
      chainId: 11142220,
      url: process.env.CELO_SEPOLIA_RPC_URL || "https://rpc.ankr.com/celo_sepolia",
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: process.env.CELOSCAN_API_KEY as string,
    // apiKey: {
    //   "celo-sepolia": process.env.CELOSCAN_API_KEY as string,
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
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=44787",
          browserURL: "https://alfajores.celoscan.io",
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
