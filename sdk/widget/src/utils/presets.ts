import type { SelfAppDisclosureConfig } from '@selfxyz/sdk-common';

export interface PresetConfig {
  disclosures: SelfAppDisclosureConfig;
  description: string;
  header: string;
}

export type PresetName = 'human' | 'age-18' | 'age-21' | 'kyc-basic' | 'kyc-full';

export const PRESETS: Record<PresetName, PresetConfig> = {
  human: {
    disclosures: {},
    description: 'Prove you are a real person without sharing any personal data.',
    header: 'Verify you are human',
  },
  'age-18': {
    disclosures: { minimumAge: 18 },
    description: 'Prove you are 18 or older without sharing your date of birth.',
    header: 'Verify you are 18+',
  },
  'age-21': {
    disclosures: { minimumAge: 21 },
    description: 'Prove you are 21 or older without sharing your date of birth.',
    header: 'Verify you are 21+',
  },
  'kyc-basic': {
    disclosures: {
      name: true,
      nationality: true,
      date_of_birth: true,
      ofac: true,
    },
    description: 'Verify your identity with basic KYC checks.',
    header: 'Verify your identity',
  },
  'kyc-full': {
    disclosures: {
      issuing_state: true,
      name: true,
      passport_number: true,
      nationality: true,
      date_of_birth: true,
      gender: true,
      expiry_date: true,
      ofac: true,
    },
    description: 'Complete identity verification with full KYC checks.',
    header: 'Complete identity verification',
  },
};

export function resolvePreset(presetName: string): PresetConfig | null {
  return PRESETS[presetName as PresetName] ?? null;
}
