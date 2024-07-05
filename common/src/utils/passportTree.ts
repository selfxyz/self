import { poseidon9, poseidon3, poseidon2 } from "poseidon-lite"
import { stringToAsciiBigIntArray } from "./utils";
import { ChildNodes,SMT } from "@zk-kit/smt"
import * as fs from 'fs';

export function passport_smt() {

  // Currently absolute path cause I am calling it from disclose_ofac.test.ts
  // After I add the export function, will use "../../ofacdata/passport.json" as path
  const passports = JSON.parse(fs.readFileSync("/Users/ashishkumarsingh/Desktop/zk/proof-of-passport/common/ofacdata/passport.json") as unknown as string)
  const tree = buildSMT(passports);
  console.log("Sparse Merkle Tree built")

  return tree
}

export function buildSMT(passports :any[]){
    let count = 0
    let startTime = performance.now();
    
    const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes))
    const tree2 = new SMT(hash2, true)

    for (let i = 0; i < passports.length; i++) {
        const passport = passports[i]

        if (i !== 0) {
          console.log('Processing passport number', i, "out of", passports.length);
        }

        if (passport.Pass_No.length > 9) {
          console.log('passport length is greater than 9:', i, passport)
          continue
        } else if (passport.Pass_No.length < 9){
          while (passport.Pass_No.length != 9) {
            passport.Pass_No += '<'
          }
        }

        const leaf2 = getOfacLeaf(stringToAsciiBigIntArray(passport.Pass_No))
        if (!leaf2) {
          continue
        }
        count += 1
        tree2.add(leaf2,BigInt(1))
      } 

    console.log("Total passports paresed are : ",count ," over ",passports.length )
    console.log('passport tree built in', performance.now() - startTime, 'ms')
    return tree2
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