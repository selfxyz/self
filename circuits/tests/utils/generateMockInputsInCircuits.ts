import { PassportData } from '../../../common/src/utils/types';
import { CircuitName } from '../../../common/src/utils/appType';
import {
    DEFAULT_MAJORITY,
    k_dsc,
    k_dsc_ecdsa,
    n_dsc,
    n_dsc_ecdsa,
    PASSPORT_ATTESTATION_ID,
} from '../../../common/src/constants/constants';
import {
    generateCircuitInputsProve,
    generateCircuitInputsRegister,
} from '../../../common/src/utils/generateInputs';
import { parseCertificate } from '../../../common/src/utils/certificates/handleCertificate';

const majority = DEFAULT_MAJORITY;
const scope = '@spaceShips';

export const generateCircuitInputsInCircuits = (
    passportData: PassportData,
    circuit: CircuitName
): any => {

    const { signatureAlgorithm } = parseCertificate(passportData.dsc);


    switch (circuit) {
        case 'register': {
            const secret = BigInt(0).toString();
            const dscSecret = BigInt(0).toString();
            const attestationId = PASSPORT_ATTESTATION_ID;
            return generateCircuitInputsRegister(
                secret,
                dscSecret,
                attestationId,
                passportData,
                signatureAlgorithm === 'ecdsa' ? n_dsc_ecdsa : n_dsc,
                signatureAlgorithm === 'ecdsa' ? k_dsc_ecdsa : k_dsc
            );
        }
        case 'prove': {
            // const bitmap = Array(90).fill('1');
            // const user_identifier = crypto.randomUUID();
            // return generateCircuitInputsProve(
            //     passportData,
            //     n_dsc,
            //     k_dsc,
            //     scope,
            //     bitmap,
            //     majority,
            //     user_identifier
            // );
        }
        default:
            throw new Error('Invalid circuit');
    }
};
