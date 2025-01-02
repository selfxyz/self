import { PassportData } from './types';
const fs = require('fs');
const path = require('path');

export function getLocalPassportData(): PassportData {
  const passportDataPath = path.join(__dirname, '../../inputs/passportData.json');
  if (fs.existsSync(passportDataPath)) {
    return require(passportDataPath);
  } else {
    throw new Error('Passport data not found at inputs/passportData.json');
  }
}
