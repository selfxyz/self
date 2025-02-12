pragma circom 2.1.9;
include "../../utils/passport/ofac/ofac_name_dob.circom";
component main { public [ smt_root ] } = OFAC_NAME_DOB(64);
