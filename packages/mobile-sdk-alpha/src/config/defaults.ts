import type { Config } from '../types/public';

/**
 * Baseline configuration used when creating a {@link SelfClient}.
 * Values here can be overridden by user-provided configuration.
 */
export const defaultConfig: Required<Config> = {
  endpoints: { api: '', teeWs: '', artifactsCdn: '' },
  timeouts: { httpMs: 30000, wsMs: 60000, scanMs: 60000, proofMs: 120000 },
  features: {},
  tlsPinning: { enabled: false },
};
