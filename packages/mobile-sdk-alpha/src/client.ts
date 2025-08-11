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
  SDKEventMap,
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
  const listeners = new Map<SDKEvent, Set<(p: any) => void>>();

  function on<E extends SDKEvent>(event: E, cb: (payload: SDKEventMap[E]) => void): Unsubscribe {
    const set = listeners.get(event) ?? new Set();
    set.add(cb as any);
    listeners.set(event, set);
    return () => set.delete(cb as any);
  }

  function emit<E extends SDKEvent>(event: E, payload: SDKEventMap[E]): void {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        (cb as (p: SDKEventMap[E]) => void)(payload);
      } catch (err) {
        _adapters.logger.log('error', `event-listener error for event '${event}'`, { event, error: err });
      }
    }
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
    void _adapters.clock.sleep(timeoutMs!, opts.signal).then(() => emit('error', new Error('timeout')));
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
    emit,
  };
}
