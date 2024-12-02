import { describe } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { formatInput } from '../../../common/src/utils/generateInputs';
import crypto from 'crypto';
import { sha384_512Pad } from '../../../common/src/utils/shaPad';
import { hash } from '../../../common/src/utils/utils';

describe('sha384', function () { 
    this.timeout(0);
  let circuit: any;
  let circuitStatic : any;

    function convertArrayToBitArray(inputArray) {
        return inputArray.flatMap((num) => 
            num.toString(2).padStart(8, '0').split('').map(Number)
        );
    }
  
  function convertToBitArray(numbers) {
    // Convert each number to 8 bits and flatten the array
    return numbers.flatMap(num => {
      // Handle negative numbers by using Uint8Array
      const uint8 = new Uint8Array(1);
      uint8[0] = num;
          
      // Convert to binary string and pad to 8 bits
      const binaryStr = uint8[0].toString(2).padStart(8, '0');
          
      // Convert string to array of bits
      return binaryStr.split('').map(Number);
    });
  }
    
    
    before(async () => {
        circuit = await wasm_tester(
          path.join(
            __dirname,
            `../../circuits/tests/utils/sha384_tester.circom`
          ),
          {
            include: [
              'node_modules',
              '../../node_modules/circomlib/circuits',
            ],
          }
        );
      
        circuitStatic = await wasm_tester(
          path.join(
            __dirname,
            `../../circuits/tests/utils/sha384_static_tester.circom`
          ),
          {
            include: [
              'node_modules',
              '../../node_modules/circomlib/circuits',
            ],
          }
        );
      });
  
      it('should compile and load the circuit', async function () {
        expect(circuit).to.not.be.undefined;
      });
  
    it('should calculate the hash correcty', async function () {
      
      const signedAttr = [
        49, 102, 48, 21, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 3,
        49, 8, 6, 6, 103, -127, 8, 1, 1, 1, 48, 28, 6, 9, 42, -122,
        72, -122, -9, 13, 1, 9, 5, 49, 15, 23, 13, 49, 57, 49, 50,
        49, 54, 49, 55, 50, 50, 51, 56, 90, 48, 47, 6, 9, 42, -122,
        72, -122, -9, 13, 1, 9, 4, 49, 34, 4, 32, 51, -119, -60,
        -100, 83, 81, 1, 84, -99, 0, -1, -4, -101, 45, -14, -76, 6,
        49, 1, -60, -43, 22, 42, 21, 111, -96, 97, 102, -66, 71, -43, -34,  
        ]
      
        const [signedAttrPadded, signedAttrPaddedLen] = sha384_512Pad(
          new Uint8Array(signedAttr),
          192
      );
      
      const hasher = crypto.createHash('sha384');
      hasher.update(Buffer.from(signedAttr));
      const hashed = hasher.digest();
      console.log('\x1b[34m%s\x1b[0m', 'hashed', hashed.toString('hex'));
      
        const w = await circuit.calculateWitness({
            in_padded: Array.from(signedAttrPadded),
            in_len_padded_bytes: signedAttrPaddedLen,
            expected: convertArrayToBitArray(Array.from(hashed)),
        });
        await circuit.checkConstraints(w);
      });
  
      it('should calculate the hash correcty', async function () {

        let formattedMrz = [
          97, 91, 95, 31, 88, 80, 60, 70, 82, 65, 68, 85,
          80, 79, 78, 84, 60, 60, 65, 76, 80, 72, 79, 78,
          83, 69, 60, 72, 85, 71, 72, 85, 69, 83, 60, 65,
          76, 66, 69, 82, 84, 60, 60, 60, 60, 60, 60, 60,
          60, 49, 53, 65, 65, 56, 49, 50, 51, 52, 52, 70,
          82, 65, 48, 48, 48, 49, 48, 49, 49, 77, 51, 48,
          48, 49, 48, 49, 53, 60, 60, 60, 60, 60, 60, 60,
          60, 60, 60, 60, 60, 60, 60, 48, 50
        ]
  
        const hashed = hash('sha384', formattedMrz);
        
          const w = await circuitStatic.calculateWitness({
              in_padded: formatInput(formattedMrz),
              expected: convertToBitArray(hashed),
          });
          await circuitStatic.checkConstraints(w);
        
      });
})