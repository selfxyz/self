import { poseidon9, poseidon2 } from "poseidon-lite"
import { IMT } from '@zk-kit/imt'
import { stringToAsciiBigIntArray } from "./utils";

export function buildPassTree(passports :any[]){
    let leaves: BigInt[] = []
    let startTime = performance.now();
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
        
        // Add some form of passport validation either here or in py script for json formation ? 
        // console.log(passport.Pass_No)
        // console.log(stringToAsciiBigIntArray(passport.Pass_No).length)
        const leaf = getOfacLeaf(stringToAsciiBigIntArray(passport.Pass_No), i)
        if (!leaf) {
          continue
        }
        leaves.push(leaf)
      } 

    console.log("Total passports paresed are : ", leaves.length," over ",passports.length )

    // What depth is optimal ?
    const tree = new IMT(poseidon2, 16, 0, 2, leaves)
    console.log('passport tree built in', performance.now() - startTime, 'ms')
    verifyProof(tree, passports)
    return tree
}

// JUST TESTING THE PROOF
export function verifyProof(tree :IMT ,passports :any[]) {
  const passno =  passports[5].Pass_No
  const leaf = getOfacLeaf(stringToAsciiBigIntArray(passno))
  const index = tree.indexOf(leaf);
  if (index === -1) {
    throw new Error("Your public key was not found in the registry");
  } else {
    console.log("Index of passport in the registry: ", index);
  }

  const proof = tree.createProof(index);
  console.log("verifyProof", tree.verifyProof(proof));
} 

// change this to take passports ascii array 
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


