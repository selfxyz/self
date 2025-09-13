import * as fs from 'fs';

import { buildAadhaarSMT } from '../trees.js';

async function build_aadhaar_ofac_smt() {
  let startTime = performance.now();
  const baseInputPath = '../../../ofacdata/inputs/';
  const baseOutputPath = '../../../ofacdata/outputs/';

  const names = JSON.parse(fs.readFileSync(`${baseInputPath}names.json`) as unknown as string);

  // -----PASSPORT DATA-----
  console.log(`Reading data from ${baseInputPath}`);
  const passports = JSON.parse(
    fs.readFileSync(`${baseInputPath}passports.json`) as unknown as string
  );

  // -----Aadhaar DATA-----
  console.log('\nBuilding Aadhaar Card SMTs...');
  const nameAndDobAadhaarTree = buildAadhaarSMT(names, 'name_and_dob');
  const nameAndYobAadhaarTree = buildAadhaarSMT(names, 'name_and_yob');

  console.log('\n--- Results ---');
  console.log(
    `Aadhaar - Name & DOB Tree:  Processed ${nameAndDobAadhaarTree[0]}/${names.length} entries in ${nameAndDobAadhaarTree[1].toFixed(2)} ms`
  );
  console.log(
    `Aadhaar - Name & YOB Tree:  Processed ${nameAndYobAadhaarTree[0]}/${names.length} entries in ${nameAndYobAadhaarTree[1].toFixed(2)} ms`
  );
  console.log('Total Time:', (performance.now() - startTime).toFixed(2), 'ms');

  console.log(`\nExporting SMTs to ${baseOutputPath}...`);
  const nameAndDobAadhaarOfacJSON = nameAndDobAadhaarTree[2].export();
  const nameAndYobAadhaarOfacJSON = nameAndYobAadhaarTree[2].export();

  fs.writeFileSync(
    `${baseOutputPath}nameAndDobAadhaarSMT.json`,
    JSON.stringify(nameAndDobAadhaarOfacJSON)
  );
  fs.writeFileSync(
    `${baseOutputPath}nameAndYobAadhaarSMT.json`,
    JSON.stringify(nameAndYobAadhaarOfacJSON)
  );

  console.log('✅ SMT export complete.');
}

build_aadhaar_ofac_smt().catch((error) => {
  console.error('Error building Aadhaar OFAC SMTs:', error);
  process.exit(1);
});
