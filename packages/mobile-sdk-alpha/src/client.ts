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

/**
 * Create a {@link SelfClient} instance using provided configuration and adapter implementations.
 *
 * @param param0 - Object containing partial configuration and platform-specific adapters.
 * @param param0.config - Configuration values to override {@link defaultConfig}.
 * @param param0.adapters - Implementations of required SDK adapters.
 * @returns Initialized client exposing document scanning, validation, and proof APIs.
 */
export function createSelfClient({ config, adapters }: { config: Config; adapters: Partial<Adapters> }): SelfClient {
  const cfg = mergeConfig(defaultConfig, config);
  const required: (keyof Adapters)[] = ['scanner', 'network', 'crypto'];
  for (const name of required) {
    if (!(name in adapters) || !adapters[name]) throw notImplemented(name);
  }

  const _adapters = { ...optionalDefaults, ...adapters } as Adapters;
  const listeners = new Map<SDKEvent, Set<(p: any) => void>>();

  /**
   * Register a callback for a specific SDK event.
   *
   * @param event - Name of the event to subscribe to.
   * @param cb - Handler invoked when the event is emitted.
   * @returns Function that removes the listener when called.
   */
  function on<E extends SDKEvent>(event: E, cb: (payload: SDKEventMap[E]) => void): Unsubscribe {
    const set = listeners.get(event) ?? new Set();
    set.add(cb as any);
    listeners.set(event, set);
    return () => set.delete(cb as any);
  }

  /**
   * Emit an SDK event to all registered listeners.
   *
   * @param event - Event identifier.
   * @param payload - Data associated with the event.
   */
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

  /**
   * Scan a document using the configured {@link ScannerAdapter}.
   *
   * @param opts - Scan options and optional abort signal.
   * @returns Result of the scan operation.
   */
  async function scanDocument(opts: ScanOpts & { signal?: AbortSignal }): Promise<ScanResult> {
    return _adapters.scanner.scan(opts);
  }

  /**
   * Perform client-side validation of a previously scanned document.
   *
   * @param _input - Validation input produced from a scan.
   * @returns Result of validation.
   */
  async function validateDocument(_input: ValidationInput): Promise<ValidationResult> {
    return { ok: false, reason: 'SELF_ERR_VALIDATION_STUB' };
  }

  /**
   * Check whether a document has already been registered with the backend.
   *
   * @param _input - Registration query parameters.
   * @returns Registration status information.
   */
  async function checkRegistration(_input: RegistrationInput): Promise<RegistrationStatus> {
    return { registered: false, reason: 'SELF_REG_STATUS_STUB' };
  }

  /**
   * Generate a cryptographic proof according to the provided request.
   *
   * @param _req - Proof parameters describing the type and payload.
   * @param opts - Optional controls for progress updates, timeouts and cancellation.
   * @returns Handle that can be used to monitor and cancel the proof process.
   */
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
