import * as fs from 'fs';
import { buildSMT } from '../../../common/src/utils/trees'

async function build_ofac_smt() {
    let startTime = performance.now();
    const baseInputPath = "../common/ofacdata/inputs/";
    const baseOutputPath = "../common/ofacdata/outputs/";

    console.log(`Reading data from ${baseInputPath}`);
    const passports = JSON.parse(fs.readFileSync(`${baseInputPath}passports.json`) as unknown as string)
    const names = JSON.parse(fs.readFileSync(`${baseInputPath}names.json`) as unknown as string)
    console.log(`Loaded ${passports.length} passport entries and ${names.length} name entries.`)

    console.log("Building Passport SMTs...");
    const passportNoAndNationalityTree = buildSMT(passports, "passport_no_and_nationality");
    const nameAndDobPassportTree = buildSMT(names, "name_and_dob");
    const nameAndYobPassportTree = buildSMT(names, "name_and_yob");

    console.log("\nBuilding ID Card SMTs...");
    const nameAndDobIdCardTree = buildSMT(names, "name_and_dob_id_card");
    const nameAndYobIdCardTree = buildSMT(names, "name_and_yob_id_card");

    console.log("\n--- Results ---");
    console.log(`Passport - Nationality Tree: Processed ${passportNoAndNationalityTree[0]}/${passports.length} entries in ${passportNoAndNationalityTree[1].toFixed(2)} ms`);
    console.log(`Passport - Name & DOB Tree:  Processed ${nameAndDobPassportTree[0]}/${names.length} entries in ${nameAndDobPassportTree[1].toFixed(2)} ms`);
    console.log(`Passport - Name & YOB Tree:  Processed ${nameAndYobPassportTree[0]}/${names.length} entries in ${nameAndYobPassportTree[1].toFixed(2)} ms`);
    console.log(`ID Card  - Name & DOB Tree:  Processed ${nameAndDobIdCardTree[0]}/${names.length} entries in ${nameAndDobIdCardTree[1].toFixed(2)} ms`);
    console.log(`ID Card  - Name & YOB Tree:  Processed ${nameAndYobIdCardTree[0]}/${names.length} entries in ${nameAndYobIdCardTree[1].toFixed(2)} ms`);
    console.log('Total Time:', (performance.now() - startTime).toFixed(2), 'ms');

    console.log(`\nExporting SMTs to ${baseOutputPath}...`);
    const passportNoAndNationalityOfacJSON = passportNoAndNationalityTree[2].export();
    const nameAndDobPassportOfacJSON = nameAndDobPassportTree[2].export();
    const nameAndYobPassportOfacJSON = nameAndYobPassportTree[2].export();
    const nameAndDobIdCardOfacJSON = nameAndDobIdCardTree[2].export();
    const nameAndYobIdCardOfacJSON = nameAndYobIdCardTree[2].export();

    fs.writeFileSync(`${baseOutputPath}passportNoAndNationalitySMT.json`, JSON.stringify(passportNoAndNationalityOfacJSON));
    fs.writeFileSync(`${baseOutputPath}nameAndDobSMT.json`, JSON.stringify(nameAndDobPassportOfacJSON));
    fs.writeFileSync(`${baseOutputPath}nameAndYobSMT.json`, JSON.stringify(nameAndYobPassportOfacJSON));
    fs.writeFileSync(`${baseOutputPath}nameAndDobSMT_ID.json`, JSON.stringify(nameAndDobIdCardOfacJSON));
    fs.writeFileSync(`${baseOutputPath}nameAndYobSMT_ID.json`, JSON.stringify(nameAndYobIdCardOfacJSON));

    console.log("✅ SMT export complete.");
}

build_ofac_smt().catch(error => {
    console.error("Error building OFAC SMTs:", error);
    process.exit(1);
});