
import { AppType } from '../../../common/src/utils/appType';
import { PassportData } from '../../../common/src/utils/types';
import { generateCircuitInputsProve } from '../../../common/src/utils/generateInputs';
import { DEFAULT_MAJORITY, k_dsc, k_dsc_ecdsa, n_dsc, n_dsc_ecdsa, PASSPORT_ATTESTATION_ID } from '../../../common/src/constants/constants';
import { revealBitmapFromAttributes } from '../../../common/src/utils/revealBitmap';
import useUserStore from '../stores/userStore';
import { ArgumentsProve } from '../../../common/src/utils/appType'
import { parseDSC } from '../../../common/src/utils/certificates/handleCertificate';

export const generateCircuitInputsInApp = (
    passportData: PassportData,
    app: AppType
): any => {

    const disclosureOptions = (app.arguments as ArgumentsProve).disclosureOptions || {};
    const { secret, dscSecret } = useUserStore.getState();
    const selector_mode = app.circuitMode === 'register' ? 1 : 0;
    const selector_older_than = 1;
    const selector_dg1 = revealBitmapFromAttributes(disclosureOptions as any).slice(0, -2) // have been moved to selector older_than
    return generateCircuitInputsProve(
        selector_mode,
        secret,
        dscSecret as string,
        passportData,
        app.scope,
        selector_dg1,
        selector_older_than,
        disclosureOptions.older_than ?? DEFAULT_MAJORITY,
        app.userId,
        app.userIdType
    );
}