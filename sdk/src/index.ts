import { OpenPassportVerifierReport } from './OpenPassportVerifierReport';
import { countryCodes } from '../../common/src/constants/constants';
import { OpenPassportVerifier } from './OpenPassportVerifier';
import {
  OpenPassportAttestation,
  OpenPassportDynamicAttestation,
} from '../../common/src/utils/openPassportAttestation';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

let OpenPassportQRcode;
if (isBrowser()) {
  OpenPassportQRcode = require('./QRcode/OpenPassportQRcode').OpenPassportQRcode;
}

export {
  OpenPassportVerifier,
  OpenPassportAttestation,
  OpenPassportDynamicAttestation,
  OpenPassportVerifierReport,
  countryCodes,
  OpenPassportQRcode,
};
