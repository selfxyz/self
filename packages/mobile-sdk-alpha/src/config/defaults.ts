import type { Config } from '../types/public';

export const defaultConfig: Required<Config> = {
  endpoints: { api: '', teeWs: '', artifactsCdn: '' },
  timeouts: { httpMs: 30000, wsMs: 60000, scanMs: 60000, proofMs: 120000 },
  features: {},
  tlsPinning: { enabled: false },
};
