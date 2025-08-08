import { defaultConfig } from './config/defaults.js';
import { notImplemented } from './errors.js';
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
} from './types/public.js';

export function createSelfClient({
  config,
  adapters,
}: {
  config: Config;
  adapters: Partial<Adapters>;
}): SelfClient {
  const _cfg = { ...defaultConfig, ...config };
  const listeners = new Map<SDKEvent, Set<(p: any) => void>>();

  function on(event: SDKEvent, cb: (payload: any) => void): Unsubscribe {
    const set = listeners.get(event) ?? new Set();
    set.add(cb);
    listeners.set(event, set);
    return () => set.delete(cb);
  }

  async function scanDocument(
    opts: ScanOpts & { signal?: AbortSignal },
  ): Promise<ScanResult> {
    if (!adapters.scanner) throw notImplemented('scanner');
    return adapters.scanner.scan(opts);
  }

  async function validateDocument(
    _input: ValidationInput,
  ): Promise<ValidationResult> {
    return { ok: false, reason: 'SELF_ERR_VALIDATION_STUB' };
  }

  async function checkRegistration(
    _input: RegistrationInput,
  ): Promise<RegistrationStatus> {
    if (!adapters.network) throw notImplemented('network');
    return { registered: false, reason: 'SELF_REG_STATUS_STUB' };
  }

  async function generateProof(
    _req: ProofRequest,
    _opts?: {
      signal?: AbortSignal;
      onProgress?: (p: Progress) => void;
      timeoutMs?: number;
    },
  ): Promise<ProofHandle> {
    if (!adapters.network) throw notImplemented('network');
    if (!adapters.crypto) throw notImplemented('crypto');
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
