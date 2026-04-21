import { AbiCoder } from 'ethers';

import selectorMap from '../data/error-selector-map.json' with { type: 'json' };

const SELECTOR_RE = /^0x[0-9a-fA-F]{8}/;
const ERROR_STRING_SELECTOR = '0x08c379a0';
const PANIC_SELECTOR = '0x4e487b71';

const PANIC_CODES: Record<number, string> = {
  0x01: 'Assertion failed',
  0x11: 'Arithmetic overflow or underflow',
  0x12: 'Division or modulo by zero',
  0x21: 'Invalid enum value',
  0x22: 'Corrupted storage byte array',
  0x31: 'Pop on empty array',
  0x32: 'Array out of bounds',
  0x41: 'Out of memory',
  0x51: 'Invalid internal function call',
};

function formatErrorName(name: string): string {
  if (name === name.toUpperCase() && name.includes('_')) {
    return name
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/**
 * Converts a raw Solidity error string into a human-readable message.
 *
 * Handles:
 * - Standard Error(string): extracts the revert message
 * - Standard Panic(uint256): maps panic code to description
 * - Known custom error selectors from our contracts (auto-generated map)
 * - Unknown input: returned unchanged
 */
export function humanizeContractError(raw: string): string {
  if (!raw) return raw;

  const lower = raw.toLowerCase();

  if (lower.startsWith(ERROR_STRING_SELECTOR)) {
    try {
      const [message] = AbiCoder.defaultAbiCoder().decode(['string'], '0x' + raw.slice(10));
      return message as string;
    } catch {
      return raw;
    }
  }

  if (lower.startsWith(PANIC_SELECTOR)) {
    try {
      const [code] = AbiCoder.defaultAbiCoder().decode(['uint256'], '0x' + raw.slice(10));
      const codeNum = Number(code);
      return PANIC_CODES[codeNum] ?? `Contract panic (code ${codeNum})`;
    } catch {
      return raw;
    }
  }

  if (SELECTOR_RE.test(raw)) {
    const selector = lower.slice(0, 10);
    const name = (selectorMap as Record<string, string>)[selector];
    if (name) return formatErrorName(name);
  }

  return raw;
}
