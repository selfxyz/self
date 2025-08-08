import type { Config } from '../types/public.js';

export const defaultConfig: Config = {
  endpoints: { api: '', teeWs: '', artifactsCdn: '' },
  timeouts: { httpMs: 30000, wsMs: 60000, scanMs: 60000, proofMs: 120000 },
  features: {},
  tlsPinning: { enabled: false },
};
