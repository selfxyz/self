import { expect } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import path from 'path';
import { formatCountriesList } from '@selfxyz/common/utils/circuits/formatInputs';
import { formatAndUnpackForbiddenCountriesList } from '@selfxyz/common/utils/circuits/formatOutputs';
import { formatInput } from '@selfxyz/common/utils/circuits/generateInputs';
import { formatMrz } from '@selfxyz/common/utils/passports/format';
import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ProveCountryIsNotInList', function () {
  this.timeout(0);
  let circuit;

  this.beforeAll(async () => {
    const circuitPath = path.resolve(
      __dirname,
      '../../circuits/tests/utils/proveCountryIsNotInList_tester.circom'
    );
    circuit = await wasm_tester(circuitPath, {
      include: [
        'node_modules',
        'node_modules/@zk-kit/binary-merkle-root.circom/src',
        'node_modules/circomlib/circuits',
      ],
    });
  });

  describe('ProveCountryIsNotInList', async () => {
    const passportData = genAndInitMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha256_65537_2048',
      'FRA',
      '000101',
      '300101'
    );
    const dg1 = formatMrz(passportData.mrz);

    it('should succeed', async () => {
      const forbiddenCountriesList = [
        'AAA',
        'USA',
        'ITA',
        'ABC',
        'DZA',
        'USA',
        'ITA',
        'ABC',
        'DZA',
        'USA',
        'ITA',
        'ABC',
        'DZA',
        'USA',
        'ITA',
        'ABC',
        'DZA',
        'USA',
        'ITA',
        'ABC',
        'DNK',
        'USA',
        'DNK',
        'ABC',
        'DNK',
        'USA',
        'DNK',
        'ABC',
        'DNK',
        'USA',
        'ITA',
        'ABC',
        'DZA',
        'USA',
        'ITA',
        'XXX',
        'DZA',
        'USA',
        'ITA',
        'END',
      ];

      const inputs = {
        dg1: formatInput(dg1),
        forbidden_countries_list: formatInput(formatCountriesList(forbiddenCountriesList)),
      };
      const witness = await circuit.calculateWitness(inputs);
      const forbidden_countries_list_packed = await circuit.getOutput(witness, [
        'forbidden_countries_list_packed[4]',
      ]);
      console.log(
        '\x1b[34m%s\x1b[0m',
        'forbidden_countries_list_packed',
        formatAndUnpackForbiddenCountriesList(forbidden_countries_list_packed)
      );
    });

    it('should faild - country FRA is in the list', async () => {
      try {
        const forbiddenCountriesList = ['DZA', 'FRA'];
        const inputs = {
          dg1: formatInput(dg1),
          forbidden_countries_list: formatInput(formatCountriesList(forbiddenCountriesList)),
        };
        const witness = await circuit.calculateWitness(inputs);
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should faild - country FRA is in the list', async () => {
      try {
        const forbiddenCountriesList = [
          'XXX',
          'XXX',
          'XXX',
          'XXX',
          'XXX',
          'XXX',
          'XXX',
          'XXX',
          'XXX',
          'FRA',
        ];
        const inputs = {
          dg1: formatInput(dg1),
          forbidden_countries_list: formatInput(formatCountriesList(forbiddenCountriesList)),
        };
        const witness = await circuit.calculateWitness(inputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should succeed - XRA and AXX are in the list, not FRA', async () => {
      const forbiddenCountriesList = [
        'XFR',
        'AXX',
        'XXX',
        'XXX',
        'XXX',
        'XXX',
        'XXX',
        'XFR',
        'AXX',
        'XXX',
      ];
      const inputs = {
        dg1: formatInput(dg1),
        forbidden_countries_list: formatInput(formatCountriesList(forbiddenCountriesList)),
      };
      const witness = await circuit.calculateWitness(inputs);
    });
  });
});
