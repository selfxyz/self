import { PassportData } from '../../../common/src/utils/types';
import { CircuitName } from '../../../common/src/utils/appType';
import {
    k_dsc,
    n_dsc,
    PASSPORT_ATTESTATION_ID,
} from '../../../common/src/constants/constants';
import {
    generateCircuitInputsProve,
    generateCircuitInputsRegister,
} from '../../../common/src/utils/generateInputs';
import { majority, scope } from './testCases';

export const generateCircuitInputsInSdk = (
    passportData: PassportData,
    circuit: CircuitName
): any => {
    switch (circuit) {
        case 'register': {
            const secret = BigInt(0).toString();
            const dscSecret = BigInt(0).toString();
            const attestationId = PASSPORT_ATTESTATION_ID;
            return generateCircuitInputsRegister(
                secret,
                dscSecret as string,
                attestationId,
                passportData,
                n_dsc,
                k_dsc
            );
        }
        case 'prove': {
            const selector_dg1 = Array(90).fill('1');
            const user_identifier = crypto.randomUUID();
            return generateCircuitInputsProve(
                passportData,
                n_dsc,
                k_dsc,
                scope,
                selector_dg1,
                majority,
                user_identifier
            );
        }
        default:
            throw new Error('Invalid circuit');
    }
};
