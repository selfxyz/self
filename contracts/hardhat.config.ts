import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.18",
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
  },
};

export default config;
