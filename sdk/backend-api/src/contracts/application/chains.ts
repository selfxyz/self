import {
    mainnet,
    sepolia,
    celo,
    celoAlfajores,
} from "viem/chains";

export function getChain(network: string) {
    switch (network) {
        case "mainnet":
            return mainnet;
        case "sepolia":
            return sepolia;
        case "celo":
            return celo;
        case "celoAlfajores":
            return celoAlfajores;
        default:
            throw new Error(`Invalid network: ${network}`);
    }
}