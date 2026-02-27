// import * as fs from 'fs';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';

// import { buildKycSMT } from '../trees.js';

// async function build_kyc_ofac_smt() {
//   let startTime = performance.now();
//   const __filename = fileURLToPath(import.meta.url);
//   const __dirname = dirname(__filename);
//   const baseInputPath = __dirname;
//   const baseOutputPath = join(__dirname, '../../../../circuits/tests/consts/ofac/');

//   const names = JSON.parse(fs.readFileSync(join(baseInputPath, 'names.json'), 'utf-8'));

//   // -----KYC DATA-----
//   console.log(`Reading data from ${baseInputPath}`);

//   // -----KYC DATA-----
//   console.log('\nBuilding KYC SMTs...');
//   const nameAndDobKycTree = buildKycSMT(names, 'name_and_dob');
//   const nameAndYobKycTree = buildKycSMT(names, 'name_and_yob');

//   console.log('\n--- Results ---');
//   console.log(
//     `KYC - Name & DOB Tree:  Processed ${nameAndDobKycTree[0]}/${names.length} entries in ${nameAndDobKycTree[1].toFixed(2)} ms`
//   );
//   console.log(
//     `KYC - Name & YOB Tree:  Processed ${nameAndYobKycTree[0]}/${names.length} entries in ${nameAndYobKycTree[1].toFixed(2)} ms`
//   );
//   console.log('Total Time:', (performance.now() - startTime).toFixed(2), 'ms');

//   console.log(`\nExporting SMTs to ${baseOutputPath}...`);
//   const nameAndDobKycOfacJSON = nameAndDobKycTree[2].export();
//   const nameAndYobKycOfacJSON = nameAndYobKycTree[2].export();

//   fs.writeFileSync(
//     `${baseOutputPath}nameAndDobKycSMT.json`,
//     JSON.stringify(nameAndDobKycOfacJSON)
//   );
//   fs.writeFileSync(
//     `${baseOutputPath}nameAndYobKycSMT.json`,
//     JSON.stringify(nameAndYobKycOfacJSON)
//   );

//   console.log('✅ SMT export complete.');
// }

// build_kyc_ofac_smt().catch((error) => {
//   console.error('Error building KYC OFAC SMTs:', error);
//   process.exit(1);
// });
