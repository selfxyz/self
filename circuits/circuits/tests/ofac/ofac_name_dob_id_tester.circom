pragma circom 2.1.9;
include "../../utils/passport/ofac/ofac_name_dob_id.circom";
component main { public [ smt_root ] } = OFAC_NAME_DOB_ID(64);
