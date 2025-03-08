import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-ignition-ethers";
import 'solidity-coverage';
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
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
  contractSizer: {
    runOnCompile: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 0
      },
      chainId: 31337,
      hardfork: "london",
      forking: {
        url: "https://rpc.ankr.com/celo",
        blockNumber: 30709382
      }
    },
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "test test test test test test test test test test test test",
        count: 20
      }
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
      accounts: [process.env.CELO_KEY as string],
    },
    celoAlfajores: {
      chainId: 44787,
      url: process.env.CELO_ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org",
      accounts: [process.env.PRIVATE_KEY as string],
    },
    celoBaklava: {
      chainId: 62320,
      url: process.env.CELO_BAKLAVA_RPC_URL || "https://baklava-forno.celo-testnet.org",
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY as string,
      ethereum: process.env.ETHERSCAN_API_KEY as string,
      celo: process.env.CELOSCAN_API_KEY as string,
    },
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io"
        }
      }
    ]
  }
};

export default config;