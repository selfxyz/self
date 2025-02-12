pragma circom 2.1.9;
include "../../utils/passport/ofac/ofac_passport_number.circom";
component main { public [ smt_root ] } = OFAC_PASSPORT_NUMBER(64);
