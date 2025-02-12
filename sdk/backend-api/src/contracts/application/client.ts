import {createPublicClient, createWalletClient, http} from "viem";
import {privateKeyToAccount} from "viem/accounts";

export function getPublicClient(chain: any, rpcUrl: string) {
    return createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
    });
}

export function getWalletClient(chain: any, privateKey: `0x${string}`, rpcUrl: string) {
    const account = privateKeyToAccount(privateKey);
    return createWalletClient({
        chain: chain,
        transport: http(rpcUrl),
        account: account,
    });
}