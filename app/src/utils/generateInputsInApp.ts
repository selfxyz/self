import { ArgumentsProveOffChain, DisclosureOptions, OpenPassportApp } from '../../../common/src/utils/appType';
import { PassportData } from '../../../common/src/utils/types';
import { generateCircuitInputsProve } from '../../../common/src/utils/generateInputs';
import { circuitToSelectorMode, DEFAULT_MAJORITY } from '../../../common/src/constants/constants';
import { revealBitmapFromAttributes } from '../../../common/src/utils/revealBitmap';
import useUserStore from '../stores/userStore';
import namejson from '../../../common/ofacdata/outputs/nameSMT.json';
import { SMT } from '@ashpect/smt';
import { poseidon2 } from 'poseidon-lite';
export const generateCircuitInputsInApp = (
    passportData: PassportData,
    app: OpenPassportApp
): any => {

    switch (app.mode) {
        case "prove_offchain":
            const disclosureOptions: DisclosureOptions = (app.args as ArgumentsProveOffChain).disclosureOptions;
            const { secret, dscSecret } = useUserStore.getState();
            const selector_mode = circuitToSelectorMode[app.mode as keyof typeof circuitToSelectorMode];
            const selector_dg1 = revealBitmapFromAttributes(disclosureOptions);
            const selector_older_than = disclosureOptions.minimumAge.enabled ? 1 : 0;
            const selector_ofac = disclosureOptions.ofac ? 1 : 0;
            let smt = new SMT(poseidon2, true);
            smt.import(namejson);
            return generateCircuitInputsProve(
                selector_mode,
                secret,
                dscSecret as string,
                passportData,
                app.scope,
                selector_dg1,
                selector_older_than,
                disclosureOptions.minimumAge.value ?? DEFAULT_MAJORITY,
                smt,
                selector_ofac,
                disclosureOptions.excludedCountries.value,
                app.userId,
                app.userIdType
            );


    }

}