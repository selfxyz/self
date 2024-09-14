
import { AppType } from '../../../common/src/utils/appType';
import { PassportData } from '../../../common/src/utils/types';
import { generateCircuitInputsProve, generateCircuitInputsRegister } from '../../../common/src/utils/generateInputs';
import { DEFAULT_MAJORITY, k_dsc, k_dsc_ecdsa, n_dsc, n_dsc_ecdsa, PASSPORT_ATTESTATION_ID } from '../../../common/src/constants/constants';
import { revealBitmapFromAttributes } from '../../../common/src/utils/revealBitmap';
import useUserStore from '../stores/userStore';
import { ArgumentsProve } from '../../../common/src/utils/appType'
import { parseDSC } from '../../../common/src/utils/certificates/handleCertificate';

export const generateCircuitInputsInApp = (
    passportData: PassportData,
    app: AppType
): any => {
    switch (app.circuit) {
        case 'register': {
            const { secret, dscSecret } = useUserStore.getState();
            const { signatureAlgorithm } = parseDSC(passportData.dsc);
            return generateCircuitInputsRegister(
                secret,
                dscSecret as string,
                PASSPORT_ATTESTATION_ID,
                passportData,
                signatureAlgorithm === 'ecdsa' ? n_dsc_ecdsa : n_dsc,
                signatureAlgorithm === 'ecdsa' ? k_dsc_ecdsa : k_dsc,
            );
        }
        case 'prove': {
            const disclosureOptions = (app.arguments as ArgumentsProve).disclosureOptions || {};
            return generateCircuitInputsProve(
                passportData,
                64, 32,
                app.scope,
                revealBitmapFromAttributes(disclosureOptions as any),
                disclosureOptions.older_than ?? DEFAULT_MAJORITY,
                app.userId,
                app.userIdType
            );
        }
        default:
            throw new Error('Invalid circuit');
    }
}