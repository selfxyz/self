import { ethers } from "ethers";

// Error Signatures and their Selectors:
// =====================================
// 0x09bde339 - InvalidProof()
// 0x646cf558 - AlreadyClaimed()
// 0xf5ae3f6f - NotRegistered(address nonRegisteredAddress)
// 0x153745d3 - RegistrationNotOpen()
// 0x697e379b - RegistrationNotClosed()
// 0x6b687806 - ClaimNotOpen()
// 0xfe9a439f - INSUFFICIENT_CHARCODE_LEN()
// 0xb3375953 - InvalidDateLength()
// 0xf1ebec96 - InvalidAsciiCode()
// 0x16f40c94 - InvalidYearRange()
// 0x25e62788 - InvalidMonthRange()
// 0x8930acef - InvalidDayRange()
// 0x3ae4ed6b - InvalidFieldElement()
// 0x17af8154 - InvalidDateDigit()
// 0x899ef10d - LENGTH_MISMATCH()
// 0x8e727f46 - NO_VERIFIER_SET()
// 0xed8cf9ff - CURRENT_DATE_NOT_IN_VALID_RANGE()
// 0xf0e539b9 - INVALID_OLDER_THAN()
// 0xbf21b11c - INVALID_FORBIDDEN_COUNTRIES()
// 0x71b125ed - INVALID_OFAC()
// 0x9003ac4d - INVALID_REGISTER_PROOF()
// 0x6a86dd76 - INVALID_DSC_PROOF()
// 0xd4d37a7a - INVALID_VC_AND_DISCLOSE_PROOF()
// 0x52906601 - INVALID_COMMITMENT_ROOT()
// 0x1ce3d3ca - INVALID_OFAC_ROOT()
// 0xa294ad3c - INVALID_CSCA_ROOT()
// 0xe0f15544 - INVALID_REVEALED_DATA_TYPE()
// 0x4ffa9998 - HUB_NOT_SET()
// 0xba0318cb - ONLY_HUB_CAN_ACCESS()
// 0x034acfcc - REGISTERED_COMMITMENT()

const errorSignatures = [
  "InvalidProof()",
  "AlreadyClaimed()",
  "NotRegistered(address nonRegisteredAddress)",
  "RegistrationNotOpen()",
  "RegistrationNotClosed()",
  "ClaimNotOpen()",
  "INSUFFICIENT_CHARCODE_LEN()",
  "InvalidDateLength()",
  "InvalidAsciiCode()",
  "InvalidYearRange()",
  "InvalidMonthRange()",
  "InvalidDayRange()",
  "InvalidFieldElement()",
  "InvalidDateDigit()",
  "LENGTH_MISMATCH()",
  "NO_VERIFIER_SET()",
  "CURRENT_DATE_NOT_IN_VALID_RANGE()",
  "INVALID_OLDER_THAN()",
  "INVALID_FORBIDDEN_COUNTRIES()",
  "INVALID_OFAC()",
  "INVALID_REGISTER_PROOF()",
  "INVALID_DSC_PROOF()",
  "INVALID_VC_AND_DISCLOSE_PROOF()",
  "INVALID_COMMITMENT_ROOT()",
  "INVALID_OFAC_ROOT()",
  "INVALID_CSCA_ROOT()",
  "INVALID_REVEALED_DATA_TYPE()",
  "HUB_NOT_SET()",
  "ONLY_HUB_CAN_ACCESS()",
  "REGISTERED_COMMITMENT()",
  "RegisteredNullifier()",
  "INVALID_ATTESTATION_ID()",
];

errorSignatures.forEach((sig) => {
  // Pls input the error code
  const errorCode = "0x22cbc6a2";
  const selector = ethers.id(sig).slice(0, 10);
  console.log("selector: ", selector);
  if (selector === errorCode) {
    console.log(`Found matching error: ${sig}`);
  }
});
