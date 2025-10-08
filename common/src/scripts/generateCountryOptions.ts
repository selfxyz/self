import { flag } from 'country-emoji';
import { writeFileSync } from 'fs';
import path from 'path';

import { countryCodes } from '../constants/constants.js';
import { getCountryISO2 } from '../constants/countries.js';

try {
  console.log('Generating country options...');

  const countryOptions = Object.keys(countryCodes).map((countryCode, index) => ({
    countryCode,
    countryName: countryCodes[countryCode as keyof typeof countryCodes],
    flagEmoji: flag(getCountryISO2(countryCode)),
    index,
  }));

  const outputPath = path.join(__dirname, './countryOptions.json');
  writeFileSync(outputPath, JSON.stringify(countryOptions, null, 2));

  console.log(`Generated country options at ${outputPath}`);
} catch (error) {
  console.error('Error generating country options:', error);
  process.exit(1);
}
