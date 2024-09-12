pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../verifier/passport_verifier_rsa_65537_sha1.circom";
include "../utils/splitSignalsToWords.circom";
include "../utils/LeafHasherLight.circom";
include "../utils/computeCommitment.circom";

template REGISTER_RSA_65537_SHA1(n, k, max_datahashes_bytes, nLevels, signatureAlgorithm) {
    signal input secret;

    signal input mrz[93];
    signal input dg1_hash_offset;
    signal input dataHashes[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input eContent[92];
    signal input signature[k];
    signal input dsc_modulus[k];
    signal input dsc_secret;
    signal input attestation_id;

    signal split_signature[9] <== SplitSignalsToWords(n, k, 230, 9)(signature);
    signal output nullifier <== Poseidon(9)(split_signature);

    signal split_modulus[9] <== SplitSignalsToWords(n, k, 230, 9)(dsc_modulus);
    component dsc_commitment_hasher = Poseidon(10);
    dsc_commitment_hasher.inputs[0] <== dsc_secret;
    for (var i = 0; i < 9; i++) {
        dsc_commitment_hasher.inputs[i + 1] <== split_modulus[i];
    }
    signal output blinded_dsc_commitment <== dsc_commitment_hasher.out;

    // Verify passport validity
    component PV = PASSPORT_VERIFIER_RSA_65537_SHA1(n, k, max_datahashes_bytes);
    PV.mrz <== mrz;
    PV.dg1_hash_offset <== dg1_hash_offset;
    PV.dataHashes <== dataHashes;
    PV.datahashes_padded_length <== datahashes_padded_length;
    PV.eContentBytes <== eContent;
    PV.dsc_modulus <== dsc_modulus;
    PV.signature <== signature;

    // Generate the leaf
    signal leaf <== LeafHasherLight(k)(dsc_modulus);

    // Generate the commitment
    signal output commitment <== ComputeCommitment()(secret, attestation_id, leaf, mrz);
}

// We hardcode 3 here for sha1WithRSAEncryption_65537
component main { public [ attestation_id ] } = REGISTER_RSA_65537_SHA1(64, 32, 320, 16, 3);
