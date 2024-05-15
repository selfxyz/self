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
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: ["0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"]
    },
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
      accounts: [process.env.PKEY as string],
      gasPrice: 5 * 10 ** 9, // Optimism uses a different gas mechanism, set to 0 for automatic handling
    },
    optimism: {
      url: "https://opt-mainnet.g.alchemy.com/v2/Mjj_SdklUaCdR6EPfVKXb7m6Pj5TjzWL",
      accounts: [process.env.PKEY_OP as string],
    }
  },
  etherscan: {
    //apiKey: "GSZW9CN933WI4N3ZMQF9XCX9R6AC2H9IZF", ethereum
    apiKey: "86Q5KMJ24TADN1WRUUVSDK31IAR44I1J4K" // optimism
  }
};

export default config;