import { poseidon9, poseidon3, poseidon2, poseidon1 } from "poseidon-lite"
import { stringToAsciiBigIntArray } from "./utils";
import { ChildNodes,SMT } from "@zk-kit/smt"
import * as fs from 'fs';

// SMT trees for 3 levels :
// 1. Passport tree  : level 3 (Absolute Match)
// 2. Names and dob combo tree : level 2 (High Probability Match)
// 3. Names tree : level 1 (Partial Match)

export function passport_smt(): [SMT, SMT, SMT] {
  let startTime = performance.now();

  //Path wrt where it is called from, i.e circuits. Replace when export and import through json
  const passports = JSON.parse(fs.readFileSync("../common/ofacdata/passport.json") as unknown as string)
  const tree = buildSMT(passports,"passport");
  const names = JSON.parse(fs.readFileSync("../common/ofacdata/names.json") as unknown as string)
  const nameDobTree = buildSMT(names,"name_dob");
  const nameTree1 = buildSMT(names,"name");

  console.log("Total passports processed are : ",tree[0] ," over ",passports.length )
  console.log("SMT for passports built in"+ tree[1] + "ms")
  console.log("Total names&dob processed are : ",nameDobTree[0] ," over ",names.length )
  console.log("SMT for names&dob built in " + nameDobTree[1] + "ms")
  console.log("Total names processed are : ",nameTree1[0] ," over ",names.length )
  console.log("SMT for names built in "+ nameTree1[1] + "ms")
  console.log('Total Time : ', performance.now() - startTime, 'ms')

  return [tree[2],nameDobTree[2],nameTree1[2]]
}

function buildSMT(field :any[], treetype:string): [number, number, SMT]{
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
          leaf = processPassport(entry.Pass_No, i)
        } else if (treetype == "name_dob") {
          leaf = processNameDob(entry, i)
        } else if (treetype == "name"){
          leaf = processName(entry.First_Name, entry.Last_Name, i)
        }
       
        if( leaf==BigInt(0) || tree.createProof(leaf).membership){
          console.log("This entry already exists in the tree, skipping...")
          continue
        }
      
        count += 1
        tree.add(leaf,BigInt(1))
      } 

    console.log("Total",treetype ,"paresed are : ",count ," over ",field.length )
    console.log(treetype, 'tree built in', performance.now() - startTime, 'ms')
    return [count, performance.now() - startTime, tree]
}

function processPassport(passno : string, index: number): bigint {
  if (passno.length > 9) {
    console.log('passport length is greater than 9:', index, passno)
  } else if (passno.length < 9){
    while (passno.length != 9) {
      passno += '<'
    }
  }

  const leaf = getPassportleaf(stringToAsciiBigIntArray(passno))
  if (!leaf) {
    console.log('Error creating leaf value', index, passno)
    return BigInt(0)
  }
  return leaf
}

function processNameDob(entry: any, i: number): bigint {
  const firstName = entry.First_Name
  const lastName = entry.Last_Name
  const day = entry.day
  const month = entry.month
  const year = entry.year
  if(day == null || month == null || year == null){
    console.log('dob is null', i, entry)
    return BigInt(0)
  }
  const nameHash = processName(firstName,lastName,i)
  const dobHash = processDob(day, month, year,i)
  const leaf = poseidon2([dobHash, nameHash])
  return leaf
}

function processName(firstName:string, lastName:string, i: number ): bigint {
  // LASTNAME<<FIRSTNAME<MIDDLENAME<<<... (6-39)
  firstName = firstName.replace(/'/g, '');
  firstName = firstName.replace(/\./g, '');
  firstName = firstName.replace(/[- ]/g, '<');
  lastName = lastName.replace(/'/g, '');
  lastName = lastName.replace(/[- ]/g, '<');
  lastName = lastName.replace(/\./g, '');
  // Removed apostrophes from the first name, eg O'Neil -> ONeil
  // Replace spaces and hyphens with '<' in the first name, eg John Doe -> John<Doe
  // TODO : Handle special cases like malaysia : no two filler characters like << for surname and givenname
  // TODO : Verify rules for . in names. eg : J. Doe (Done same as apostrophe for now)

  let arr = lastName + '<<' + firstName
  if (arr.length > 39) {
    arr = arr.substring(0, 44)
  } else {
    while (arr.length < 44) {
      arr += '<'
    }
  }
  let nameArr = stringToAsciiBigIntArray(arr)
  return getNameLeaf(nameArr, i)
}

function processDob(day: string, month: string, year: string, i : number): bigint {
  // YYMMDD
  const monthMap: { [key: string]: string } = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12"
  };

  month = monthMap[month.toLowerCase()];
  year = year.slice(-2);
  const dob = year + month + day;
  let arr = stringToAsciiBigIntArray(dob);
  return getDobLeaf(arr,i)
}

export function getPassportleaf(passport: (bigint|number)[], i?: number): bigint {
  if (passport.length !== 9) {
    console.log('parsed passport length is not 9:', i, passport)
    return
  }
  try {
    return poseidon9(passport)
  } catch (err) {
    console.log('err : passport', err, i, passport)
  }
}

export function getNameDobLeaf(nameMrz : (bigint|number)[], dobMrz : (bigint|number)[], i? : number): bigint {
  return poseidon2([getNameLeaf(nameMrz), getDobLeaf(dobMrz)])
}

export function getNameLeaf(nameMrz : (bigint|number)[] , i? : number ) : bigint {
  let concatenatedBigInts = [];
  let chunks = [];

  chunks.push(nameMrz.slice(0, 13), nameMrz.slice(13, 26), nameMrz.slice(26, 39)); // 39/3 for posedion to digest

  for(const chunk of chunks){
    const strArr: string[] = Array.from(chunk).map(String);
    const concatenatedStr: string = strArr.join('');
    const result: bigint = BigInt(concatenatedStr);
    concatenatedBigInts.push(result);
  }

  try {
    return poseidon3(concatenatedBigInts)
  } catch (err) {
    console.log('err : Name', err, i, nameMrz)
  }
}

export function getDobLeaf(dobMrz : (bigint|number)[], i? : number): bigint {
  const strArr: string[] = Array.from(dobMrz).map(String);
  const concatenatedStr: string = strArr.join('');
  let result: bigint[] = []
  result.push(BigInt(concatenatedStr));

  try {
    return poseidon1(result)
  } catch (err) {
    console.log('err : Dob', err, i, dobMrz)
  }
}