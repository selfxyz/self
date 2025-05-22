import * as fs from 'fs';
import path from 'path';

import { buildSMT } from '../../../common/src/utils/aadhaar/tree'
const namesPath = path.resolve(__dirname,'../../../common/ofacdata/inputs/namestest.json');
const outputsDir = path.resolve(__dirname,'../../../common/ofacdata/outputs');
  
  fs.mkdirSync(outputsDir, { recursive: true });

async function build_ofac_smt() {
    let startTime = performance.now();

    const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));

    const nameAndDobTree = buildSMT(names, "name_and_dob");
    const nameAndYobTree = buildSMT(names, "name_and_yob");

    console.log("Total names and dob processed are : ", nameAndDobTree[0], " over ", names.length)
    console.log("SMT for names and dob built in " + nameAndDobTree[1] + "ms")
    console.log("Total names and yob processed are : ", nameAndYobTree[0], " over ", names.length)
    console.log("SMT for names and yob built in " + nameAndYobTree[1] + "ms")
    console.log('Total Time : ', performance.now() - startTime, 'ms')

    const nameAndDobOfacJSON = nameAndDobTree[2].export()
    const nameAndYobOfacJSON = nameAndYobTree[2].export()
  
  fs.writeFileSync(path.join(outputsDir, 'nameAndDobAadhaarSMT.json'),JSON.stringify(nameAndDobOfacJSON));
  fs.writeFileSync(path.join(outputsDir, 'nameAndYobAadhaarSMT.json'),JSON.stringify(nameAndYobOfacJSON));
}

build_ofac_smt()