export { getMockDSC } from './getMockDSC.js';
export { genMockPassportData, genAndInitMockPassportData } from './genMockPassportData.js';
export { genMockIdDoc, genMockIdDocAndInitDataParsing, generateMockDSC } from './genMockIdDoc.js';
export type { IdDocInput } from './genMockIdDoc.js';
export { genDG1 } from './dg1.js';
export { AADHAAR_MOCK_PRIVATE_KEY_PEM, AADHAAR_MOCK_PUBLIC_KEY_PEM } from './mockAadhaarCert.js';
export {
  testCustomData,
  testDefaultQRData,
  generateTestData,
  createCustomV2TestData,
  returnNewDateString,
} from './genMockAadhaarData.js';
export {
  NON_OFAC_DUMMY_KYC_DATA,
  OFAC_DUMMY_KYC_DATA,
  genMockKycDocument,
} from './genMockKycData.js';
