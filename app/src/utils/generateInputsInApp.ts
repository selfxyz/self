
import { AppType } from '../../../common/src/utils/appType';
import { PassportData } from '../../../common/src/utils/types';
import { generateCircuitInputsProve, generateCircuitInputsRegister } from '../../../common/src/utils/generateInputs';
import { DEFAULT_MAJORITY, k_dsc, n_dsc, PASSPORT_ATTESTATION_ID } from '../../../common/src/constants/constants';
import { revealBitmapFromAttributes } from '../../../common/src/utils/revealBitmap';
import useUserStore from '../stores/userStore';
import { ArgumentsProve } from '../../../common/src/utils/appType'

export const generateCircuitInputsInApp = (
    passportData: PassportData,
    app: AppType
): any => {
    switch (app.circuit) {
        case 'register': {
            const { secret, dscSecret } = useUserStore.getState();
            return generateCircuitInputsRegister(secret, dscSecret as string, PASSPORT_ATTESTATION_ID, passportData, n_dsc, k_dsc);
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