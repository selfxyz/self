export const DEPLOYMENT_BLOCK = 30404108; // 7649934 for sepolia;

export type TreeType = 'dsc' | 'identity' | 'csca';

export interface EventsData {
    index: number;
    commitment: string;
    blockNumber: number;
};
