import { expect } from 'chai';
import { X509Certificate } from 'crypto';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';
import { formatMrz } from '../../../common/src/utils/utils';
import { formatInput } from '../../../common/src/utils/generateInputs';

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
                './node_modules/@zk-kit/binary-merkle-root.circom/src',
                './node_modules/circomlib/circuits',
            ],
        });
    });



    describe('ProveCountryIsNotInList', async () => {
        const passportData = genMockPassportData('rsa_sha256', 'FRA', '000101', '300101');
        const dg1 = formatMrz(passportData.mrz);


        it('should succeed', async () => {
            const forbiddenCountriesList = ['GER', 'DZA', 'ALG'];
            const forbiddenCountriesListFormatted = forbiddenCountriesList.map(country =>
                country.charCodeAt(0) * 1000000 + country.charCodeAt(1) * 1000 + country.charCodeAt(2)
            );
            const inputs = {
                dg1: formatInput(dg1),
                forbidden_countries_list: formatInput(forbiddenCountriesListFormatted),
            };
            const witness = await circuit.calculateWitness(inputs);
        });

        it('should faild - country FRA is in the list', async () => {
            const forbiddenCountriesList = ['FRA', 'DZA', 'ALG'];
            const forbiddenCountriesListFormatted = forbiddenCountriesList.map(country =>
                country.charCodeAt(0) * 1000000 + country.charCodeAt(1) * 1000 + country.charCodeAt(2)
            );
            try {
                const inputs = {
                    dg1: formatInput(dg1),
                    forbidden_countries_list: formatInput(forbiddenCountriesListFormatted),
                };
                const witness = await circuit.calculateWitness(inputs);
                expect.fail('Expected an error but none was thrown.');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });
    });


});
