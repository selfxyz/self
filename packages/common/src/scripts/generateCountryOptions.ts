import { countryCodes } from '../constants/constants';
import getCountryISO2 from 'country-iso-3-to-2';
import { flag } from 'country-emoji';
import fs from 'fs';
import path from 'path';

try {
  console.log('Generating country options...');

  const countryOptions = Object.keys(countryCodes).map((countryCode, index) => ({
    countryCode,
    countryName: countryCodes[countryCode as keyof typeof countryCodes],
    flagEmoji: flag(getCountryISO2(countryCode)),
    index,
  }));

  const outputPath = path.join(__dirname, './countryOptions.json');
  fs.writeFileSync(outputPath, JSON.stringify(countryOptions, null, 2));

  console.log(`Generated country options at ${outputPath}`);
} catch (error) {
  console.error('Error generating country options:', error);
  process.exit(1);
}
