export const DEPLOYMENT_BLOCK = 7649934;

export type TreeType = 'dsc' | 'identity' | 'csca';

export interface EventsData {
    index: number;
    commitment: string;
    merkleRoot: string;
    blockNumber: number;
    timestamp: number;
};
