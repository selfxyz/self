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


        const logs = await publicClient.getContractEvents({
            address: contract.address,
            abi: contract.abi,
            eventName: eventName,
            fromBlock: BigInt(startBlock),
            toBlock: 'latest',
            strict: true
        });

        console.log(`\x1b[90mFound ${logs.length} ${eventName} events\x1b[0m`);

        const events: EventsData[] = [];

        for (const log of logs) {
            try {
                if (!log.blockNumber) continue;

                const { commitment, imtIndex, imtRoot } = log.args as {
                    commitment: bigint,
                    imtIndex: bigint,
                    imtRoot: bigint
                };

                const block = await publicClient.getBlock({
                    blockNumber: log.blockNumber
                });

                events.push({
                    index: Number(imtIndex),
                    commitment: commitment.toString(),
                    merkleRoot: imtRoot.toString(),
                    blockNumber: Number(log.blockNumber),
                    timestamp: Number(block.timestamp)
                });
            } catch (error) {
                console.error(`Error processing log for ${eventName}:`, error);
            }
        }

        return events;
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
