import { ArgumentsDisclose, ArgumentsProveOffChain, DisclosureOptions, OpenPassportApp } from '../../../common/src/utils/appType';
import { PassportData } from '../../../common/src/utils/types';
import { generateCircuitInputsDisclose, generateCircuitInputsProve } from '../../../common/src/utils/generateInputs';
import { circuitToSelectorMode, DEFAULT_MAJORITY, getCountryCode, PASSPORT_ATTESTATION_ID } from '../../../common/src/constants/constants';
import { revealBitmapFromAttributes } from '../../../common/src/utils/revealBitmap';
import useUserStore from '../stores/userStore';
import namejson from '../../../common/ofacdata/outputs/nameSMT.json';
import { SMT } from '@ashpect/smt';
import { poseidon2 } from 'poseidon-lite';
import { LeanIMT } from '@zk-kit/imt';

export const generateCircuitInputsInApp = async (
    passportData: PassportData,
    app: OpenPassportApp
): Promise<any> => {
    const { secret, dscSecret } = useUserStore.getState();
    const selector_mode = circuitToSelectorMode[app.mode as keyof typeof circuitToSelectorMode];
    let smt = new SMT(poseidon2, true);
    smt.import(namejson);
    switch (app.mode) {
        case "prove_offchain":
        case "prove_onchain":
            const disclosureOptions: DisclosureOptions = (app.args as ArgumentsProveOffChain).disclosureOptions;
            const selector_dg1 = revealBitmapFromAttributes(disclosureOptions);
            const selector_older_than = disclosureOptions.minimumAge.enabled ? 1 : 0;
            const selector_ofac = disclosureOptions.ofac ? 1 : 0;

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
                disclosureOptions.excludedCountries.value.map(country => getCountryCode(country)),
                app.userId,
                app.userIdType
            );
            break;
        case "register":
            const selector_dg1_zero = new Array(88).fill(0);
            const selector_older_than_zero = 0;
            const selector_ofac_zero = 0;
            return generateCircuitInputsProve(
                selector_mode,
                secret,
                dscSecret as string,
                passportData,
                app.scope,
                selector_dg1_zero,
                selector_older_than_zero,
                DEFAULT_MAJORITY,
                smt,
                selector_ofac_zero,
                [],
                app.userId,
                app.userIdType
            );
            break;
        case "vc_and_disclose":
            const commitmentMerkleTreeUrl = (app as any).args.commitmentMerkleTreeUrl;
            const response = await fetch(commitmentMerkleTreeUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const commitmentMerkleTree = await response.json();
            console.log("commitmentMerkleTree", commitmentMerkleTree);
            const tree = new LeanIMT((a, b) => poseidon2([a, b]));
            tree.import(commitmentMerkleTree);

            const disclosureOptionsDisclose: DisclosureOptions = (app.args as ArgumentsDisclose).disclosureOptions;
            const selector_dg1_disclose = revealBitmapFromAttributes(disclosureOptionsDisclose);
            const selector_older_than_disclose = disclosureOptionsDisclose.minimumAge.enabled ? 1 : 0;
            return generateCircuitInputsDisclose(secret, PASSPORT_ATTESTATION_ID, passportData, tree, disclosureOptionsDisclose.minimumAge.value ?? DEFAULT_MAJORITY, selector_dg1_disclose, selector_older_than_disclose, app.scope, app.userId)
    }

}