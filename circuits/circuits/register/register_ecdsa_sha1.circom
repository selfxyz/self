pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../verifier/passport_verifier_ecdsa_sha1.circom";
include "../utils/computeCommitment.circom";
include "../utils/leafHasherLight.circom";

template REGISTER_ECDSA_SHA1(n, k, max_datahashes_bytes, nLevels, signatureAlgorithm) {
    signal input secret;

    signal input mrz[93];
    signal input dg1_hash_offset;
    signal input dataHashes[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input eContent[92];

    signal input signature_r[k]; // ECDSA signature component r
    signal input signature_s[k]; // ECDSA signature component s
    signal input dsc_modulus_x[k]; // Public Key x-coordinate
    signal input dsc_modulus_y[k]; // Public Key y-coordinate

    signal input dsc_secret;
    signal input attestation_id;

    // hash the dsc pubkey to generate the leaf
    component leafHasher = LeafHasherLightWithSigAlgECDSA(k);
    leafHasher.sigAlg <== signatureAlgorithm;
    leafHasher.x <== dsc_modulus_x;
    leafHasher.y <== dsc_modulus_y;
    signal leaf <== leafHasher.out;

    
    component dsc_commitment_hasher = Poseidon(2);
    component nullifier_hasher = Poseidon(2);

    dsc_commitment_hasher.inputs[0] <== dsc_secret;
    dsc_commitment_hasher.inputs[1] <== leaf;

    signal output blinded_dsc_commitment <== dsc_commitment_hasher.out;

    // Poseidon(signature_r[0], signature_r[1], ..., signature_r[5])
    signal signature_r_hash <== Poseidon(k)(signature_r);
    signal signature_s_hash <== Poseidon(k)(signature_s);

    nullifier_hasher.inputs[0] <== signature_r_hash;
    nullifier_hasher.inputs[1] <== signature_s_hash;
    signal output nullifier <== nullifier_hasher.out;

    // Verify passport validity
    component PV = PASSPORT_VERIFIER_ECDSA_SHA1(n, k, max_datahashes_bytes);
    PV.mrz <== mrz;
    PV.dg1_hash_offset <== dg1_hash_offset;
    PV.dataHashes <== dataHashes;
    PV.datahashes_padded_length <== datahashes_padded_length;
    PV.eContentBytes <== eContent;
    PV.dsc_modulus <== [dsc_modulus_x, dsc_modulus_y];
    PV.signature_r <== signature_r;
    PV.signature_s <== signature_s;

    // Generate the commitment
    signal output commitment <== ComputeCommitment()(secret, attestation_id, leaf_hasher.out, mrz);
}

// We hardcode 7 here for ecdsa_with_SHA1
component main { public [ attestation_id ] } = REGISTER_ECDSA_SHA1(43, 6, 320, 16, 7);
