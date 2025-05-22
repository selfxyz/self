// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');

/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import assert from 'assert';
import {
  prepareTestDataExtractor,
} from '../../../common/src/utils/aadhaar/aadhaar';

describe('Extractor', function () {
  this.timeout(0);

  let circuit: any;

  this.beforeAll(async () => {
    circuit = await circom_tester(
      path.join(__dirname, '../../circuits/tests/aadhaar/extractor.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );
  });

  it('should generate witness for circuit', async () => {
    const { inputs } = prepareTestDataExtractor();
    // console.log(inputs);
    // console.log(inputs.qrDataPadded.length);
    await circuit.calculateWitness(inputs);
  });

  it('should extract data', async () => {
    const { inputs } = prepareTestDataExtractor();
    const witness: any[] = await circuit.calculateWitness(inputs);
    // console.log(witness, witness.length);

    //NameHash
    const value = BigInt(
      '948855446484890256796791120157965939898937470990304708559398895582336127482'
    );
    assert((witness[1]) == value);

    //RefID
    assert(Number(witness[2]) == 2697);

    // // Timestamp
    // console.log(witness[4]);
    // assert(
    //   new Date(Number(witness[1]) * 1000).getTime() ===
    //     new Date('2019-03-08T05:30:00.000Z').getTime()
    // );

    //TODO-change
    // Age
    assert(Number(witness[4]) == (35));
    // year Of Birth
    assert(Number(witness[5]) == 84);
    // monthofbirth
    assert(Number(witness[6]) == 1);
    // dayofbirth;
    assert(Number(witness[7]) == 1);
    // DobHash;
    assert((witness[8]) == BigInt('124042181534158974680486158040584178760834524593809439015791333757793339013')
    );
    // Gender
    assert(Number(witness[9]) == 77);
    // TDOD
    // Yeah theres state
    // pinCode;
    assert(Number(witness[11]) == 110051);
  });
});
