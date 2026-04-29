import type { SelfAppDisclosureConfig, DisclosurePresetName } from '../foundation/types/app.js';

export const DISCLOSURE_PRESETS: Record<DisclosurePresetName, SelfAppDisclosureConfig> = {
  'basic-kyc': {
    name: true,
    nationality: true,
    date_of_birth: true,
    ofac: true,
  },
  'age-verification': {
    date_of_birth: true,
    minimumAge: 18,
  },
  'full-passport': {
    issuing_state: true,
    name: true,
    passport_number: true,
    nationality: true,
    date_of_birth: true,
    gender: true,
    expiry_date: true,
    ofac: true,
  },
  'ofac-only': {
    ofac: true,
  },
};

export function resolveDisclosures(
  input: SelfAppDisclosureConfig | DisclosurePresetName | undefined,
): SelfAppDisclosureConfig {
  if (input == null) return {};
  if (typeof input === 'string') {
    const preset = DISCLOSURE_PRESETS[input];
    if (!preset) {
      const validNames = Object.keys(DISCLOSURE_PRESETS).join(', ');
      throw new Error(`Unknown disclosure preset '${input}'. Valid presets: ${validNames}`);
    }
    return { ...preset };
  }
  return input;
}
