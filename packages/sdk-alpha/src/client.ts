import { defaultConfig } from './config/defaults';
import { mergeConfig } from './config/merge';
import { notImplemented } from './errors';
import type {
  Adapters,
  Config,
  Progress,
  ProofHandle,
  ProofRequest,
  RegistrationInput,
  RegistrationStatus,
  ScanOpts,
  ScanResult,
  SDKEvent,
  SelfClient,
  Unsubscribe,
  ValidationInput,
  ValidationResult,
} from './types/public';

const optionalDefaults: Partial<Adapters> = {
  storage: {
    get: async () => null,
    set: async () => {},
    remove: async () => {},
  },
  clock: {
    now: () => Date.now(),
    sleep: async (ms: number) => {
      await new Promise(r => setTimeout(r, ms));
    },
  },
  logger: {
    log: () => {},
  },
};

export function createSelfClient({ config, adapters }: { config: Config; adapters: Partial<Adapters> }): SelfClient {
  const cfg = mergeConfig(defaultConfig, config);
  const required: (keyof Adapters)[] = ['scanner', 'network', 'crypto'];
  for (const name of required) {
    if (!(name in adapters) || !adapters[name]) throw notImplemented(name);
  }

  const _adapters = { ...optionalDefaults, ...adapters } as Adapters;
  const _cfg = { ...defaultConfig, ...config };
  const listeners = new Map<SDKEvent, Set<(p: any) => void>>();

  function on(event: SDKEvent, cb: (payload: any) => void): Unsubscribe {
    const set = listeners.get(event) ?? new Set();
    set.add(cb);
    listeners.set(event, set);
    return () => set.delete(cb);
  }

  async function scanDocument(opts: ScanOpts & { signal?: AbortSignal }): Promise<ScanResult> {
    return _adapters.scanner.scan(opts);
  }

  async function validateDocument(_input: ValidationInput): Promise<ValidationResult> {
    return { ok: false, reason: 'SELF_ERR_VALIDATION_STUB' };
  }

  async function checkRegistration(_input: RegistrationInput): Promise<RegistrationStatus> {
    return { registered: false, reason: 'SELF_REG_STATUS_STUB' };
  }

  async function generateProof(
    _req: ProofRequest,
    opts: {
      signal?: AbortSignal;
      onProgress?: (p: Progress) => void;
      timeoutMs?: number;
    } = {},
  ): Promise<ProofHandle> {
    if (!adapters.network) throw notImplemented('network');
    if (!adapters.crypto) throw notImplemented('crypto');
    const timeoutMs = opts.timeoutMs ?? cfg.timeouts?.proofMs ?? defaultConfig.timeouts.proofMs;
    void timeoutMs;
    return {
      id: 'stub',
      status: 'pending',
      result: async () => ({ ok: false, reason: 'SELF_ERR_PROOF_STUB' }),
      cancel: () => {},
    };
  }

  return {
    scanDocument,
    validateDocument,
    checkRegistration,
    generateProof,
    on,
  };
}
