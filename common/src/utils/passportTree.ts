import { poseidon9, poseidon3, poseidon2, poseidon1 } from "poseidon-lite"
import { stringToAsciiBigIntArray } from "./utils";
import { ChildNodes,SMT } from "@zk-kit/smt"
import * as fs from 'fs';

// smt trees for 3 levels :
// 1. Passport tree  : level 3 (Absolute Match)
// 2. Names and dob combo tree : level 2 (High Probability Match)
// 3. Names tree : level 1 (Partial Match)

export function passport_smt(): [SMT, SMT, SMT] {

  // Currently absolute path cause I am calling it from disclose_ofac.test.ts
  // After I add the export function, will use "../../ofacdata/passport.json" as path
  const passports = JSON.parse(fs.readFileSync("/Users/ashishkumarsingh/Desktop/zk/proof-of-passport/common/ofacdata/passport.json") as unknown as string)
  const tree = buildSMT(passports,"passport");
  console.log("SMT for passports built")

  const names = JSON.parse(fs.readFileSync("/Users/ashishkumarsingh/Desktop/zk/proof-of-passport/common/ofacdata/names.json") as unknown as string)
  const nameTree = buildSMT(names,"name_dob");
  console.log("SMT for names built")

  return [tree,nameTree,nameTree]
}
//okosdkoskdosdkosdksodk

export function buildSMT(field :any[], treetype:string){
    let count = 0
    let startTime = performance.now();
    
    const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes))
    const tree = new SMT(hash2, true)

    for (let i = 0; i < field.length; i++) {
        const entry = field[i]

        if (i !== 0) {
          console.log('Processing', treetype,'number', i, "out of", field.length);
        }

        let leaf = BigInt(0)
        if (treetype == "passport") {
          leaf = getPassportLeaf(entry.Pass_No, i)
        } else if (treetype == "name_dob") {
          leaf = getNameDobLeaf(entry, i)
        } else if (treetype == "name"){
          leaf = getNameLeaf(entry, i)
        }
       
        if( leaf==BigInt(0) || tree.createProof(leaf).membership){
          console.log("This entry already exists in the tree, skipping...")
          continue
        }
      
        count += 1
        tree.add(leaf,BigInt(1))
      } 

    console.log("Total passports paresed are : ",count ," over ",field.length )
    console.log('passport tree built in', performance.now() - startTime, 'ms')
    return tree
}

function getPassportLeaf(passno : string, index: number): bigint {
  if (passno.length > 9) {
    console.log('passport length is greater than 9:', index, passno)
  } else if (passno.length < 9){
    while (passno.length != 9) {
      passno += '<'
    }
  }

  const leaf = getOfacLeaf(stringToAsciiBigIntArray(passno))
  if (!leaf) {
    console.log('Error creating leaf value', index, passno)
    return BigInt(0)
  }
  return leaf
}

function getNameDobLeaf(entry: any, i: number): bigint {
  return BigInt(0)
}

function getNameLeaf(entry: any, i: number): bigint {
  console.log(entry.First_Name, entry.Last_Name)
  const nameChunk = nameRules(entry)
  const leaf = poseidon3(nameChunk)
  console.log(leaf)

  return leaf
}

export function getOfacLeaf(passport: any, i?: number): bigint {
  if (passport.length !== 9) {
    console.log('parsed passport length is not 9:', i, passport)
    return
  }
  // change into bigint if not already
  try {
    return poseidon9(passport)
  } catch (err) {
    console.log('err : passport', err, i, passport)
  }
}

function nameRules(name:any): bigint[] {
  // Rules for names : https://egov.ice.gov/sevishelp/schooluser/machine-readable_passport_name_standards.htm
  // Todo : Handle special cases like malaysia : no two filler characters like << for surname and givenname
  // LASTNAME<<FIRSTNAME<MIDDLENAME<<<... (6-39)
  // Remove apostrophes from the first name, eg O'Neil -> ONeil
  // Replace spaces and hyphens with '<' in the first name, eg John Doe -> John<Doe
  let firstName = name.First_Name
  let lastName = name.Last_Name
  firstName = firstName.replace(/'/g, '');
  firstName = firstName.replace(/\./g, '');
  firstName = firstName.replace(/[- ]/g, '<');
  lastName = lastName.replace(/'/g, '');
  lastName = lastName.replace(/[- ]/g, '<');
  lastName = lastName.replace(/\./g, '');

  let arr = lastName + '<<' + firstName
  if (arr.length > 39) {
    arr = arr.substring(0, 44)
  } else {
    while (arr.length < 44) {
      arr += '<'
    }
  }
  console.log(arr)
  let nameArr = stringToAsciiBigIntArray(arr)

  let concatenatedBigInts = [];
  let chunks = [];
  chunks.push(nameArr.slice(0, 13), nameArr.slice(13, 26), nameArr.slice(26, 39)); // 39/3 for posedion to digest

  for(const chunk of chunks){
    const strArr: string[] = Array.from(chunk).map(String);
    const concatenatedStr: string = strArr.join('');
    const result: bigint = BigInt(concatenatedStr);
    concatenatedBigInts.push(result);
  }
  return concatenatedBigInts;
}
