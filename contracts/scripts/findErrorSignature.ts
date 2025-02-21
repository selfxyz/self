import { ethers } from 'ethers';

const errorSignatures = [
    'InvalidProof()',
    'AlreadyClaimed()',
    'NotRegistered(address nonRegisteredAddress)',
    'RegistrationNotOpen()',
    'RegistrationNotClosed()',
    'ClaimNotOpen()',
    'INSUFFICIENT_CHARCODE_LEN()',
    'InvalidDateLength()',
    'InvalidAsciiCode()',
    'InvalidYearRange()',
    'InvalidMonthRange()',
    'InvalidDayRange()',
    'InvalidFieldElement()',
    'InvalidDateDigit()',
    'LENGTH_MISMATCH()',
    'NO_VERIFIER_SET()',
    'CURRENT_DATE_NOT_IN_VALID_RANGE()',
    'INVALID_OLDER_THAN()',
    'INVALID_FORBIDDEN_COUNTRIES()',
    'INVALID_OFAC()',
    'INVALID_REGISTER_PROOF()',
    'INVALID_DSC_PROOF()',
    'INVALID_VC_AND_DISCLOSE_PROOF()',
    'INVALID_COMMITMENT_ROOT()',
    'INVALID_OFAC_ROOT()',
    'INVALID_CSCA_ROOT()',
    'INVALID_REVEALED_DATA_TYPE()',
    'HUB_NOT_SET()',
    'ONLY_HUB_CAN_ACCESS()',
    'REGISTERED_COMMITMENT()'
];

errorSignatures.forEach(sig => {
  // Pls input the error code
  const errorCode = '0xf1ebec96';
  const selector = ethers.id(sig).slice(0, 10);
  if (selector === errorCode) {
    console.log(`Found matching error: ${sig}`);
  }
});