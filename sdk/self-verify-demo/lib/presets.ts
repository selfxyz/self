export interface PresetConfig {
  id: string;
  name: string;
  preset: string;
  description: string;
  proven: string[];
  private: string[];
}

export const PRESETS: PresetConfig[] = [
  {
    id: 'humanity',
    name: 'Prove Humanity',
    preset: 'human',
    description: 'Prove you are a real person without revealing any personal information.',
    proven: ['Human identity verified'],
    private: ['Name', 'Date of birth', 'Nationality', 'Passport number', 'Gender'],
  },
  {
    id: 'age',
    name: 'Age Verification',
    preset: 'age-18',
    description: 'Prove you are over 18 without revealing your date of birth.',
    proven: ['Over 18'],
    private: ['Date of birth', 'Name', 'Nationality', 'Passport number', 'Gender'],
  },
  {
    id: 'kyc',
    name: 'KYC Check',
    preset: 'kyc-basic',
    description: 'Complete basic KYC — name, nationality, date of birth, and OFAC compliance.',
    proven: ['Full name', 'Nationality', 'Date of birth', 'OFAC compliance'],
    private: ['Passport number', 'Gender', 'Document expiry'],
  },
];
