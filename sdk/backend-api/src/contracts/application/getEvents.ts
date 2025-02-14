import { getContractInstance } from "./getContracts";
import { getChain } from "./chains";
import { EventsData } from "./tree-reader/constants";

async function getEvents(
    eventName: string,
    startBlock: number,
    rpcUrl: string,
    network: string
): Promise<EventsData[]> {
    try {
        const chain = getChain(network);
        const { contract, publicClient } = getContractInstance(
            "registry",
            chain,
            process.env.PRIVATE_KEY as `0x${string}`,
            rpcUrl
        );

        // Retrieve the latest block number so we know our upper bound.
        const latestBlock = await publicClient.getBlockNumber();
        // Set the maximum block range for a single query.
        const maxBlockRange = 50000;
        let currentFromBlock = startBlock;
        let allLogs: any[] = [];

        // Loop over block ranges in chunks.
        while (currentFromBlock <= latestBlock) {
            const currentToBlock = Math.min(currentFromBlock + maxBlockRange - 1, Number(latestBlock));
            console.log(
                `Fetching ${eventName} logs from block ${currentFromBlock} to ${currentToBlock}`
            );
            try {
                const logsChunk = await publicClient.getContractEvents({
                    address: contract.address,
                    abi: contract.abi,
                    eventName: eventName,
                    fromBlock: BigInt(currentFromBlock),
                    toBlock: BigInt(currentToBlock),
                    strict: true,
                });
                allLogs = [...allLogs, ...logsChunk];
            } catch (err) {
                console.error(
                    `Error fetching logs for ${eventName} from block ${currentFromBlock} to ${currentToBlock}`,
                    err
                );
                throw err;
            }
            currentFromBlock = currentToBlock + 1;
        }

        console.log(`Found ${allLogs.length} total ${eventName} events over sliced blocks`);

        // Process each log into an EventsData object.
        const events: EventsData[] = [];
        for (const log of allLogs) {
            if (!log.blockNumber) continue;

            const { commitment, imtIndex, imtRoot } = log.args as {
                commitment: bigint,
                imtIndex: bigint,
                imtRoot: bigint
            };

            events.push({
                index: Number(imtIndex),
                commitment: commitment.toString(),
                merkleRoot: imtRoot.toString(),
                blockNumber: Number(log.blockNumber),
                timestamp: Number(log.blockTimestamp),
            });
        }

        return events.sort((a, b) => a.index - b.index);
    } catch (error) {
        console.error(`Error getting ${eventName} events:`, error);
        throw error;
    }
}

export async function getDscCommitmentEvents(
    startBlock: number,
    rpcUrl: string,
    network: string
): Promise<EventsData[]> {
    const events = await Promise.all([
        getEvents('DevDscKeyCommitmentRegistered', startBlock, rpcUrl, network),
        getEvents('DscKeyCommitmentRegistered', startBlock, rpcUrl, network)
    ]).then(([devEvents, regularEvents]) => [...devEvents, ...regularEvents]);

    return events.sort((a, b) => a.index - b.index);
}

export async function getIdentityCommitmentEvents(
    startBlock: number,
    rpcUrl: string,
    network: string
): Promise<EventsData[]> {
    const events = await getEvents('CommitmentRegistered', startBlock, rpcUrl, network);
    return events.sort((a, b) => a.index - b.index);
}
