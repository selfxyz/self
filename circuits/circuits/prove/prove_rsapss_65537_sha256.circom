pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "../verifier/passport_verifier_rsapss_65537_sha256.circom";
include "binary-merkle-root.circom";
include "../utils/splitSignalsToWords.circom";
include "../utils/leafHasher.circom";
include "../disclose/disclose.circom";

template PROVE_RSAPSS_65537_SHA256(n, k, max_datahashes_bytes) {
    /*** CUSTOM IMPLEMENTATION ***/
    signal input mrz[93];
    signal input dg1_hash_offset;
    signal input dataHashes[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input eContent[104];
    signal input signature[k];
    signal input dsc_modulus[k];
    signal output signature_algorithm <== 001;

    // Verify passport validity
    component PV = PASSPORT_VERIFIER_RSAPSS_65537_SHA256(n, k, max_datahashes_bytes);
    PV.mrz <== mrz;
    PV.dg1_hash_offset <== dg1_hash_offset;
    PV.dataHashes <== dataHashes;
    PV.datahashes_padded_length <== datahashes_padded_length;
    PV.eContentBytes <== eContent;
    PV.dsc_modulus <== dsc_modulus;
    PV.signature <== signature;

    /*** COMMON TO ALL CIRCUITS ***/
    signal input scope;
    signal input bitmap[90];
    signal input current_date[6]; // YYMMDD - num
    signal input majority[2]; // YY - ASCII
    signal input user_identifier; 

    // verify passport validity and disclose optional data
    component disclose = DISCLOSE();
    disclose.mrz <== mrz;
    disclose.bitmap <== bitmap;
    disclose.current_date <== current_date;
    disclose.majority <== majority;
    signal output revealedData_packed[3] <== disclose.revealedData_packed;

    // generate nullifier
    signal split_signature[9] <== SplitSignalsToWords(n, k, 230, 9)(signature);
    component nullifier_hasher = Poseidon(10);
    for (var i = 0; i < 9; i++) {
        nullifier_hasher.inputs[i] <== split_signature[i];
    }
    nullifier_hasher.inputs[9] <== scope;
    signal output nullifier <== nullifier_hasher.out;
}

component main { public [ dsc_modulus, scope, user_identifier, current_date ]  } = PROVE_RSAPSS_65537_SHA256(64, 32, 320);
