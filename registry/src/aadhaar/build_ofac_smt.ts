import * as fs from 'fs';
import { buildSMT } from '../../../common/src/utils/trees'

async function build_ofac_smt() {
    let startTime = performance.now();

    const names = JSON.parse(fs.readFileSync("../../../common/ofacdata/inputs/names.json") as unknown as string)

    const nameAndDobTree = buildSMT(names, "name_and_dob");
    const nameAndYobTree = buildSMT(names, "name_and_yob");

    console.log("Total names and dob processed are : ", nameAndDobTree[0], " over ", names.length)
    console.log("SMT for names and dob built in " + nameAndDobTree[1] + "ms")
    console.log("Total names and yob processed are : ", nameAndYobTree[0], " over ", names.length)
    console.log("SMT for names and yob built in " + nameAndYobTree[1] + "ms")
    console.log('Total Time : ', performance.now() - startTime, 'ms')

    const nameAndDobOfacJSON = nameAndDobTree[2].export()
    const nameAndYobOfacJSON = nameAndYobTree[2].export()

    fs.writeFileSync("../../../common/ofacdata/outputs/nameAndDobSMT.json", JSON.stringify(nameAndDobOfacJSON));
    fs.writeFileSync("../../../common/ofacdata/outputs/nameAndYobSMT.json", JSON.stringify(nameAndYobOfacJSON));
}

build_ofac_smt()