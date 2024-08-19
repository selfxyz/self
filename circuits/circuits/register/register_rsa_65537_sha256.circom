pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "../verifier/passport_verifier_rsa_65537_sha256.circom";
include "binary-merkle-root.circom";
include "../utils/splitSignalsToWords.circom";
include "../utils/leafHasher.circom";

template REGISTER_RSA_65537_SHA256(n, k, max_datahashes_bytes, nLevels, signatureAlgorithm) {
    signal input secret;

    signal input mrz[93];
    signal input dg1_hash_offset;
    signal input dataHashes[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input eContent[104];
    signal input signature[k];
    signal input dsc_modulus[k];
    signal input dsc_secret;
    signal input attestation_id;

    component splitSignalsToWords_modulus = SplitSignalsToWords(n,k,230,9);
    component splitSignalsToWords_signature = SplitSignalsToWords(n,k,230,9);
    splitSignalsToWords_modulus.in <== dsc_modulus;
    splitSignalsToWords_signature.in <== signature;
    component nullifier_hasher = Poseidon(9);
    component dsc_commitment_hasher = Poseidon(10);
    dsc_commitment_hasher.inputs[0] <== dsc_secret;
    for (var i= 0; i < 9; i++) {
        nullifier_hasher.inputs[i] <== splitSignalsToWords_signature.out[i];
        dsc_commitment_hasher.inputs[i+1] <== splitSignalsToWords_modulus.out[i];
    }
    signal output blinded_dsc_commitment <== dsc_commitment_hasher.out;
    signal output nullifier <== nullifier_hasher.out;

    // Verify passport validity
    component PV = PASSPORT_VERIFIER_RSA_65537_SHA256(n, k, max_datahashes_bytes);
    PV.mrz <== mrz;
    PV.dg1_hash_offset <== dg1_hash_offset;
    PV.dataHashes <== dataHashes;
    PV.datahashes_padded_length <== datahashes_padded_length;
    PV.eContentBytes <== eContent;
    PV.dsc_modulus <== dsc_modulus;
    PV.signature <== signature;

    // Generate the leaf
    component leaf_hasher = LeafHasher(n,k);
    leaf_hasher.in <== dsc_modulus;

    // Generate the commitment
    component poseidon_hasher = Poseidon(6);
    poseidon_hasher.inputs[0] <== secret;
    poseidon_hasher.inputs[1] <== attestation_id;
    poseidon_hasher.inputs[2] <== leaf_hasher.out;

    signal mrz_packed[3] <== PackBytes(93)(mrz);
    for (var i = 0; i < 3; i++) {
        poseidon_hasher.inputs[i + 3] <== mrz_packed[i];
    }
    signal output commitment <== poseidon_hasher.out;

}

// We hardcode 1 here for sha256WithRSAEncryption_65537
component main { public [ attestation_id ] } = REGISTER_RSA_65537_SHA256(121, 17, 320, 16, 1);
