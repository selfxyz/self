import { PassportData } from '../../../common/src/utils/types';
import { CircuitName } from '../../../common/src/utils/appType';
import { k_dsc, n_dsc, PASSPORT_ATTESTATION_ID } from '../../../common/src/constants/constants';
import { generateCircuitInputsProve } from '../../../common/src/utils/generateInputs';
import { majority, scope } from './testCases';

export const generateCircuitInputsInSdk = (
  passportData: PassportData,
  circuit: CircuitName
): any => {
  switch (circuit) {
    case 'prove':
      const selector_dg1 = Array(88).fill('1');
      const selector_older_than = 1;
      const selector_mode = 0;
      const secret = 0;
      const dsc_secret = 0;
      const user_identifier = crypto.randomUUID();
      return generateCircuitInputsProve(
        selector_mode,
        secret,
        dsc_secret,
        passportData,
        scope,
        selector_dg1,
        selector_older_than,
        majority,
        user_identifier
      );
    default:
      throw new Error('Invalid circuit');
  }
};
