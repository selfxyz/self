pragma circom 2.1.9;

include "./vc_and_disclose_kyc.circom";

component main {
    public [
        scope,
        merkle_root,
        ofac_name_dob_smt_root,
        ofac_name_yob_smt_root,
        user_identifier,
        current_date,
        attestation_id
    ]
} = VC_AND_DISCLOSE_KYC(40, 64, 64, 33);
