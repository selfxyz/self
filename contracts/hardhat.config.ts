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
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      accounts: ["0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"]
    },
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.public.blastapi.io",
      accounts: [process.env.PRIVATE_KEY as string],
    },
    celo: {
      chainId: 42220,
      url: process.env.CELO_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    celoAlfajores: {
      chainId: 44787,
      url: process.env.CELO_ALFAJORES_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    celoBaklava: {
      chainId: 62320,
      url: process.env.CELO_BAKLAVA_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY as string,
      ethereum: process.env.ETHERSCAN_API_KEY as string,
    }
  }
};

export default config;