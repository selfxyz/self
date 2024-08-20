pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../verifier/passport_verifier_ecdsa_sha256.circom";
include "../utils/computeCommitment.circom";

template REGISTER_ECDSA_SHA256(n, k, max_datahashes_bytes, nLevels, signatureAlgorithm) {
    signal input secret;

    signal input mrz[93];
    signal input dg1_hash_offset;
    signal input dataHashes[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input eContent[104];

    signal input signature_r[k]; // ECDSA signature component r
    signal input signature_s[k]; // ECDSA signature component s
    signal input dsc_modulus[2][k]; // Public Key (split into Qx and Qy)

    signal input dsc_secret;
    signal input attestation_id;
    
    // Hash DSC pubkey and signature components
    // Poseidon(dsc_pubkey[0][0], dsc_pubkey[0][1], ..., dsc_pubkey[0][5])
    signal dsc_pubkey_x_hash <== Poseidon(k)(dsc_modulus[0]);
    signal dsc_pubkey_y_hash <== Poseidon(k)(dsc_modulus[1]);

    // Poseidon(signature_r[0], signature_r[1], ..., signature_r[5])
    signal signature_r_hash <== Poseidon(k)(signature_r);
    signal signature_s_hash <== Poseidon(k)(signature_s);

    component dsc_commitment_hasher = Poseidon(3);
    component nullifier_hasher = Poseidon(2);
    component leaf_hasher = Poseidon(3);

    dsc_commitment_hasher.inputs[0] <== dsc_secret;    
    dsc_commitment_hasher.inputs[1] <== dsc_pubkey_x_hash;
    dsc_commitment_hasher.inputs[2] <== dsc_pubkey_y_hash;

    nullifier_hasher.inputs[0] <== signature_r_hash;
    nullifier_hasher.inputs[1] <== signature_s_hash;

    leaf_hasher.inputs[0] <== signatureAlgorithm;
    leaf_hasher.inputs[1] <== dsc_pubkey_x_hash;
    leaf_hasher.inputs[2] <== dsc_pubkey_y_hash;

    signal output blinded_dsc_commitment <== dsc_commitment_hasher.out;
    signal output nullifier <== nullifier_hasher.out;
    
    // Verify passport validity
    component PV = PASSPORT_VERIFIER_ECDSA_SHA256(n, k, max_datahashes_bytes);
    PV.mrz <== mrz;
    PV.dg1_hash_offset <== dg1_hash_offset;
    PV.dataHashes <== dataHashes;
    PV.datahashes_padded_length <== datahashes_padded_length;
    PV.eContentBytes <== eContent;
    PV.dsc_modulus <== dsc_modulus;
    PV.signature_r <== signature_r;
    PV.signature_s <== signature_s;

    // signature is valid
    PV.result === 1; 

    // Generate the commitment
    signal output commitment <== ComputeCommitment()(secret, attestation_id, leaf_hasher.out, mrz);
}

// We hardcode 8 here for ecdsa_with_SHA256
component main { public [ attestation_id ] } = REGISTER_ECDSA_SHA256(43, 6, 320, 16, 8);
