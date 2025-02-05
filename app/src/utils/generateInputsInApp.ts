// import { SMT } from '@openpassport/zk-kit-smt';
// import { poseidon2 } from 'poseidon-lite';

// import namejson from '../../../common/ofacdata/outputs/nameSMT.json';
// import {
//   DEFAULT_MAJORITY,
//   PASSPORT_ATTESTATION_ID,
//   circuitToSelectorMode,
//   getCountryCode,
// } from '../../../common/src/constants/constants';
// import {
//   ArgumentsDisclose,
//   ArgumentsProveOffChain,
//   DisclosureAttributes,
//   DisclosureOptions,
//   type GetDisclosure,
//   OpenPassportApp,
// } from '../../../common/src/utils/appType';
// import { revealBitmapFromAttributes } from '../../../common/src/utils/circuits/formatOutputs';
// import { generateCircuitInputsVCandDisclose } from '../../../common/src/utils/circuits/generateInputs';
// import { fetchTreeFromUrl } from '../../../common/src/utils/trees';
// import { PassportData } from '../../../common/src/utils/types';
// import useUserStore from '../stores/userStore';

// export const generateCircuitInputsInApp = async (
//   passportData: PassportData,
//   app: OpenPassportApp,
// ): Promise<any> => {
//   const { secret, dscSecret } = useUserStore.getState();
//   const selector_mode =
//     circuitToSelectorMode[app.mode as keyof typeof circuitToSelectorMode];
//   let smt = new SMT(poseidon2, true);
//   smt.import(namejson);
//   switch (app.mode) {
//     case 'prove_offchain':
//     case 'prove_onchain':
//       const disclosureOptions: DisclosureOptions = (
//         app.args as ArgumentsProveOffChain
//       ).disclosureOptions;
//       const selector_dg1 = revealBitmapFromAttributes(disclosureOptions);
//       const minimumAge = get('minimumAge', disclosureOptions);
//       const selector_older_than = minimumAge?.enabled ? 1 : 0;
//       const selector_ofac = isEnabled('ofac', disclosureOptions);
//       const forbidden_countries_list = get(
//         'excludedCountries',
//         disclosureOptions,
//       )?.value.map(country => getCountryCode(country));
//       const inputs = generateCircuitInputsProve(
//         selector_mode,
//         secret,
//         dscSecret as string,
//         passportData,
//         app.scope,
//         selector_dg1,
//         selector_older_than,
//         minimumAge?.value ?? DEFAULT_MAJORITY,
//         smt,
//         selector_ofac,
//         forbidden_countries_list,
//         app.userId,
//         app.userIdType,
//       );
//       return inputs;
//     case 'register':
//       const selector_dg1_zero = new Array(88).fill(0);
//       const selector_older_than_zero = 0;
//       const selector_ofac_zero = 0;
//       return generateCircuitInputsProve(
//         selector_mode,
//         secret,
//         dscSecret as string,
//         passportData,
//         app.scope,
//         selector_dg1_zero,
//         selector_older_than_zero,
//         DEFAULT_MAJORITY,
//         smt,
//         selector_ofac_zero,
//         [],
//         app.userId,
//         app.userIdType,
//       );
//     case 'vc_and_disclose':
//       const commitmentMerkleTreeUrl = (app as any).args.commitmentMerkleTreeUrl;
//       const tree = await fetchTreeFromUrl(commitmentMerkleTreeUrl);

//       const disclosureOptionsDisclose: DisclosureOptions = (
//         app.args as ArgumentsDisclose
//       ).disclosureOptions;

//       const selector_dg1_disclose = revealBitmapFromAttributes(
//         disclosureOptionsDisclose,
//       );
//       const minAgeInDisclose = get('minimumAge', disclosureOptionsDisclose);
//       const selector_older_than_disclose = minAgeInDisclose?.enabled ? 1 : 0;
//       const selector_ofac_disclose = isEnabled(
//         'ofac',
//         disclosureOptionsDisclose,
//       );
//       const forbidden_countries_list_disclose = get(
//         'excludedCountries',
//         disclosureOptionsDisclose,
//       )?.value.map(country => getCountryCode(country));
//       return generateCircuitInputsVCandDisclose(
//         secret,
//         PASSPORT_ATTESTATION_ID,
//         passportData,
//         app.scope,
//         selector_dg1_disclose,
//         selector_older_than_disclose,
//         tree,
//         minAgeInDisclose?.value ?? DEFAULT_MAJORITY,
//         smt,
//         selector_ofac_disclose,
//         forbidden_countries_list_disclose!,
//         app.userId,
//       );
//   }
// };

// function get<T extends DisclosureAttributes = DisclosureAttributes>(
//   key: T,
//   from: DisclosureOptions,
// ): GetDisclosure<T> | undefined {
//   const result = from.find(({ key: k }) => k === key);
//   return result as GetDisclosure<T>;
// }

// function isEnabled(key: DisclosureAttributes, from: DisclosureOptions): 1 | 0 {
//   return get(key, from)?.enabled ? 1 : 0;
// }
