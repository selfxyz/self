import * as circomTester from 'circom_tester';

/**
 * Compatibility adapter for `circom_tester`.
 *
 * Why this exists:
 * - During pnpm migration we kept `circom_tester` on the current upstream Git ref.
 * - Some returned circuit objects may not expose `getOutput(...)`.
 * - Existing tests rely on `getOutput(...)` heavily.
 *
 * Contract:
 * - If upstream provides `getOutput`, pass through unchanged.
 * - If missing, derive outputs from witness + symbols map.
 *
 * Removal criteria:
 * - Upstream `circom_tester` exposes a stable `getOutput` API for all circuits
 *   we compile in CI.
 * - Circuits CI passes with direct imports from `circom_tester`.
 */
type Circuit = Record<string, unknown> & {
  getOutput?: (witness: unknown[], signals: string[]) => Promise<Record<string, unknown>>;
};

const ARRAY_SELECTOR = /^(.*)\[(\d+)\]$/;

const toSignalVariants = (signal: string): string[] => {
  if (signal.startsWith('main.')) {
    return [signal, signal.slice(5)];
  }
  return [signal, `main.${signal}`];
};

const extractWitnessIndex = (entry: unknown): number | null => {
  if (typeof entry === 'number') return entry;
  if (typeof entry === 'bigint') return Number(entry);
  if (typeof entry !== 'object' || entry === null) return null;

  const obj = entry as Record<string, unknown>;
  const candidates = ['varIdx', 'witness', 'witnessIndex', 'idx', 'index', 'wireIdx'];
  for (const key of candidates) {
    const value = obj[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
  }
  return null;
};

const getSymbols = (circuit: Circuit): Record<string, unknown> => {
  const symbols = (circuit.symbols ?? circuit.sym ?? circuit.signalMap ?? {}) as Record<string, unknown>;
  return symbols;
};

const expandRequestedSignals = (signals: string[]): string[] => {
  const expanded: string[] = [];
  for (const signal of signals) {
    const match = signal.match(ARRAY_SELECTOR);
    if (!match) {
      expanded.push(signal);
      continue;
    }

    const [, base, maybeLen] = match;
    const len = Number(maybeLen);
    if (!Number.isInteger(len) || len < 0) {
      expanded.push(signal);
      continue;
    }

    for (let i = 0; i < len; i += 1) {
      expanded.push(`${base}[${i}]`);
    }
  }
  return expanded;
};

const installGetOutputShim = (circuit: Circuit): Circuit => {
  if (typeof circuit.getOutput === 'function') {
    return circuit;
  }

  circuit.getOutput = async function getOutputShim(witness: unknown[], requestedSignals: string[]) {
    const symbols = getSymbols(circuit);
    const expandedSignals = expandRequestedSignals(requestedSignals);
    const output: Record<string, unknown> = {};

    for (const signal of expandedSignals) {
      let index: number | null = null;

      for (const variant of toSignalVariants(signal)) {
        if (!(variant in symbols)) continue;
        index = extractWitnessIndex(symbols[variant]);
        if (index !== null) break;
      }

      if (index === null) {
        throw new Error(`Unable to resolve witness index for signal "${signal}"`);
      }

      output[signal] = witness[index];
    }

    return output;
  };

  return circuit;
};

const wrapFactory = <
  TFactory extends ((...args: unknown[]) => Promise<Circuit>) | undefined,
>(
  factory: TFactory,
) => {
  if (!factory) return factory;
  return (async (...args: unknown[]) => {
    const circuit = await factory(...args);
    return installGetOutputShim(circuit);
  }) as TFactory;
};

export const wasm = wrapFactory((circomTester as { wasm?: (...args: unknown[]) => Promise<Circuit> }).wasm);
export const c = wrapFactory((circomTester as { c?: (...args: unknown[]) => Promise<Circuit> }).c);
