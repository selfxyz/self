pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "../verifier/passport_verifier_rsa_65537_sha256.circom";
include "binary-merkle-root.circom";
include "../utils/splitSignalsToWords.circom";
include "../utils/leafHasher.circom";
include "../disclose/disclose.circom";

template PROVE_RSA_65537_SHA256(n, k, max_datahashes_bytes, signatureAlgorithm) {

    /*** CUSTOM IMPLEMENTATION ***/
    signal input mrz[93];
    signal input dg1_hash_offset;
    signal input dataHashes[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input eContent[104];
    signal input signature[k];
    signal input dsc_modulus[k];

    // generate nullifier
    component splitSignalsToWords_signature = SplitSignalsToWords(n,k,230,9);
    splitSignalsToWords_signature.in <== signature;
    component nullifier_hasher = Poseidon(9);
    for (var i= 0; i < 9; i++) {
        nullifier_hasher.inputs[i] <== splitSignalsToWords_signature.out[i];

    }

    // Verify passport validity
    component PV = PASSPORT_VERIFIER_RSA_65537_SHA256(n, k, max_datahashes_bytes);
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
    disclose.user_identifier <== user_identifier;
    disclose.scope <== scope;
    disclose.secret <== nullifier_hasher.out;
    signal output revealedData_packed[3] <== disclose.revealedData_packed;
    signal output nullifier <== disclose.nullifier;

}

component main { public [dsc_modulus, user_identifier, current_date ]  } = PROVE_RSA_65537_SHA256(121, 17, 320, 1);
