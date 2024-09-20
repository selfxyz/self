pragma circom 2.1.6;

include "../utils/passport/customHashers.circom";
include "../utils/passport/computeCommitment.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/passportVerifier.circom";
include "../disclose/disclose.circom";

template OPENPASSPORT_PROVE(signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;

    var HASH_LEN_BITS = getHashLength(signatureAlgorithm);
    var HASH_LEN_BYTES = HASH_LEN_BITS / 8;

    signal input dg1[93];
    signal input dg1_hash_offset;
    signal input dg2_hash[64];
    signal input eContent[MAX_ECONTENT_PADDED_LEN];
    signal input eContent_padded_length;
    signal input signed_attr[MAX_SIGNED_ATTR_PADDED_LEN];
    signal input signed_attr_padded_length;
    signal input signed_attr_econtent_hash_offset;
    signal input pubKey[kScaled];
    signal input signature[kScaled];
    signal input selector_mode; // 0 - disclose, 1 - registration
    // disclose related inputs
    signal input selector_dg1[88];
    signal input selector_older_than;
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input user_identifier; 
    signal input scope;
    // registration related inputs
    signal input secret;
    signal input dsc_secret;

    signal attestation_id <== 1;

    // assert selector_mode is 0 or 1
    selector_mode * (selector_mode - 1) === 0;

    // verify passport signature
    PassportVerifier(signatureAlgorithm, n, k, MAX_ECONTENT_PADDED_LEN, MAX_SIGNED_ATTR_PADDED_LEN)(dg1,dg1_hash_offset, dg2_hash, eContent,eContent_padded_length, signed_attr, signed_attr_padded_length, signed_attr_econtent_hash_offset, pubKey, signature);

    // nulifier
    signal signatureHashed <== CustomHasher(kScaled)(signature); // generate nullifier
    signal output nullifier <== Poseidon(2)([signatureHashed, scope]);

    // DISCLOSE (optional)
    // optionally disclose data
    component disclose = DISCLOSE();
    disclose.dg1 <== dg1;
    disclose.selector_dg1 <== selector_dg1;
    disclose.selector_older_than <== selector_older_than;
    disclose.current_date <== current_date;
    disclose.majority <== majority;
    signal output revealedData_packed[3] <== disclose.revealedData_packed;
    signal output older_than[2] <== disclose.older_than;

    // REGISTRATION (optional)
    // generate the commitment
    signal leaf <== LeafHasher(kScaled)(pubKey, signatureAlgorithm);
    signal commitmentPrivate <== ComputeCommitment()(secret, attestation_id, leaf, dg1, dg2_hash);
    signal output commitment <== commitmentPrivate * selector_mode;
    // blinded dsc commitment
    signal pubkeyHash <== CustomHasher(kScaled)(pubKey);
    signal blindedDscCommitmenPrivate <== Poseidon(2)([dsc_secret, pubkeyHash]);
    signal output blinded_dsc_commitment <== blindedDscCommitmenPrivate * selector_mode;

}