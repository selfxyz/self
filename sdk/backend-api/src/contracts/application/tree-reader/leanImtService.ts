import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import { poseidon2 } from "poseidon-lite";
import { getContractInstanceRoot } from "./getTree";
import { addEventsInDB, setTreeInDB, getLastEventFromDB, getTreeFromDB } from "./db";
import { getDscCommitmentEvents, getIdentityCommitmentEvents } from "../getEvents";
import { DEPLOYMENT_BLOCK, EventsData, TreeType } from "./constants";

export class MerkleTreeService {
    private imt: LeanIMT;
    private type: TreeType;
    constructor(type: TreeType) {
        this.type = type;
        this.imt = new LeanIMT((a, b) => poseidon2([a, b]));
        this.initializeTree();
    }

    private async initializeTree() {
        console.log(`Initializing ${this.type} tree`);
        const treeFromDB = await getTreeFromDB(this.type);
        if (treeFromDB) {
            console.log(`${this.type} tree found in DB, importing`);
            const hashFunction = (a: any, b: any) => poseidon2([a, b]);
            const tree = LeanIMT.import(hashFunction, treeFromDB);
            this.imt = tree;
        }
        else {
            console.log(`${this.type} tree not found in DB, initializing from contract`);
        }
        await this.checkForUpdates();
    }

    private insertCommitment(commitment: string) {
        this.imt.insert(BigInt(commitment));
    }

    public getRoot(): string {
        if (this.imt.root === undefined) {
            return '0';
        }
        else {
            return this.imt.root.toString();
        }
    }

    private serializeTree() {
        return this.imt.export();
    }

    private async checkForEvents() {
        const lastEventData = await getLastEventFromDB(this.type);
        const lastEventBlock = lastEventData?.blockNumber || DEPLOYMENT_BLOCK;
        const lastEventIndex = lastEventData?.index || -1;

        let events: EventsData[];
        switch (this.type) {
            case 'dsc':
                events = await getDscCommitmentEvents(lastEventBlock, process.env.RPC_URL as string, process.env.NETWORK as string);
                break;
            case 'identity':
                events = await getIdentityCommitmentEvents(lastEventBlock, process.env.RPC_URL as string, process.env.NETWORK as string);
                break;
            default:
                throw new Error('Invalid tree type');
        }

        for (const event of events) {
            if (event.index > lastEventIndex) {
                this.insertCommitment(event.commitment);
            }
        }

        const contractRoot = await getContractInstanceRoot(this.type);
        const localRoot = this.getRoot().toString();

        if (contractRoot === localRoot) {
            try {
                const eventsAdded = await addEventsInDB(this.type, events);
                const serializedTree = this.serializeTree();
                const treeSet = await setTreeInDB(this.type, serializedTree);
            } catch (error) {
                console.error('Error during DB updates:', error);
                throw error;
            }
        } else {
            throw new Error('Root does not match after updating the tree');
        }
    }

    private async checkForUpdates() {
        const contractRoot = await getContractInstanceRoot(this.type);
        if (contractRoot !== this.getRoot()) {
            console.log(`${this.type} root are different, checking for events`);
            await this.checkForEvents();
        }
        else {
            console.log(`${this.type} root match, no events to check`);
        }
    }

    public async getTree() {
        await this.checkForUpdates();
        return this.serializeTree();
    }

    private getTablePrefix(): string {
        switch (this.type) {
            case 'dsc':
                return 'dsc_key_commitment';
            case 'identity':
                return 'identity_commitment';
            default:
                throw new Error('Invalid tree type');
        }
    }
}
