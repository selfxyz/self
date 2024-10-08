import { AppType } from '../../../common/src/utils/appType';
import { PassportData } from '../../../common/src/utils/types';
import { generateCircuitInputsProve } from '../../../common/src/utils/generateInputs';
import { circuitToSelectorMode, DEFAULT_MAJORITY, k_dsc, k_dsc_ecdsa, n_dsc, n_dsc_ecdsa, PASSPORT_ATTESTATION_ID } from '../../../common/src/constants/constants';
import { revealBitmapFromAttributes } from '../../../common/src/utils/revealBitmap';
import useUserStore from '../stores/userStore';
import { ArgumentsProve } from '../../../common/src/utils/appType'
import { parseDSC } from '../../../common/src/utils/certificates/handleCertificate';
import { generateCircuitInputsDSC } from '../../../common/src/utils/csca';
import namejson from '../../../common/ofacdata/outputs/nameSMT.json';
import { SMT } from '@ashpect/smt';
import { poseidon2 } from 'poseidon-lite';
export const generateCircuitInputsInApp = (
    passportData: PassportData,
    app: AppType
): any => {

    const disclosureOptions = (app.arguments as ArgumentsProve).disclosureOptions || {};
    console.log('disclosureOptions', disclosureOptions);

    const { secret, dscSecret } = useUserStore.getState();
    const selector_mode = circuitToSelectorMode[app.circuitMode as keyof typeof circuitToSelectorMode];
    console.log('selector_mode', selector_mode);
    const selector_dg1 = revealBitmapFromAttributes(disclosureOptions as any).slice(0, -2) // have been moved to selector older_than
    console.log('selector_dg1', selector_dg1);
    let smt = new SMT(poseidon2, true);
    smt.import(namejson);
    console.log('(disclosureOptions as any).forbidden_countries', (disclosureOptions as any).forbidden_countries);
    return generateCircuitInputsProve(
        selector_mode,
        secret,
        dscSecret as string,
        passportData,
        app.scope,
        selector_dg1,
        1,
        // (disclosureOptions as any).older_than ? 1 : 0,
        disclosureOptions.older_than && disclosureOptions.older_than.length > 2 ? disclosureOptions.older_than : DEFAULT_MAJORITY,
        smt,
        // (disclosureOptions as any).ofac ? 1 : 0,
        1,
        (disclosureOptions as any).forbidden_countries_list ? (disclosureOptions as any).forbidden_countries_list : [],
        app.userId,
        app.userIdType
    );
}