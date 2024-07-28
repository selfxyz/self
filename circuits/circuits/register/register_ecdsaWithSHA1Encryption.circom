pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/utils/bytes.circom";
include "./verifier/passport_verifier_ecdsaWithSHA1Encryption.circom";
include "binary-merkle-root.circom";
include "../utils/splitSignalsToWords.circom";

template Register_ecdsaWithSHA1Encryption(n, k, max_datahashes_bytes, nLevels, signatureAlgorithm) {
    signal input secret;
    signal input mrz[93];
    signal input dg1_hash_offset;
    signal input econtent[max_datahashes_bytes];
    signal input datahashes_padded_length;
    signal input signed_attributes[92];

    signal input signature_r[k]; // ECDSA signature component r
    signal input signature_s[k]; // ECDSA signature component s
    signal input dsc_modulus[2][k]; // Public Key (split into Qx and Qy)

    signal input dsc_secret;
    signal input attestation_id;
    
    // Hash DSC modulus and signature components
    // Poseidon(dsc_modulus[0][0], dsc_modulus[0][1], ..., dsc_modulus[0][5])
    component poseidon_hasher_dsc_modules_x = Poseidon(6);
    component poseidon_hasher_dsc_modules_y = Poseidon(6);

    // Poseidon(signature_r[0], signature_r[1], ..., signature_r[5])
    component poseidon_hasher_signature_r = Poseidon(6);
    component poseidon_hasher_signature_s = Poseidon(6);

    for (var i = 0; i < k; i++) {
        poseidon_hasher_dsc_modules_x.inputs[i] <== dsc_modulus[0][i];
        poseidon_hasher_dsc_modules_y.inputs[i] <== dsc_modulus[1][i];
        poseidon_hasher_signature_r.inputs[i] <== signature_r[i];
        poseidon_hasher_signature_s.inputs[i] <== signature_s[i];
    }

    component dsc_commitment_hasher = Poseidon(3);
    component nullifier_hasher = Poseidon(3);
    component leaf_hasher = Poseidon(3);

    dsc_commitment_hasher.inputs[0] <== dsc_secret;    
    dsc_commitment_hasher.inputs[1] <== poseidon_hasher_dsc_modules_x.out;
    dsc_commitment_hasher.inputs[2] <== poseidon_hasher_dsc_modules_y.out;

    nullifier_hasher.inputs[0] <== secret;
    nullifier_hasher.inputs[1] <==  poseidon_hasher_signature_r.out;
    nullifier_hasher.inputs[2] <==  poseidon_hasher_signature_s.out;

    leaf_hasher.inputs[0] <== signatureAlgorithm;
    leaf_hasher.inputs[1] <== poseidon_hasher_dsc_modules_x.out;
    leaf_hasher.inputs[2] <== poseidon_hasher_dsc_modules_y.out;

    signal output blinded_dsc_commitment <== dsc_commitment_hasher.out;
    signal output nullifier <== nullifier_hasher.out;
    
    // Verify passport validity
    component PV = PassportVerifier_ecdsaWithSHA1Encryption(n, k, max_datahashes_bytes);
    PV.mrz <== mrz;
    PV.dg1_hash_offset <== dg1_hash_offset;
    PV.dataHashes <== econtent;
    PV.datahashes_padded_length <== datahashes_padded_length;
    PV.eContentBytes <== signed_attributes;
    PV.dsc_modulus <== dsc_modulus;
    PV.signature_r <== signature_r;
    PV.signature_s <== signature_s;

    // signature is valid
    PV.result === 1; 

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

component main { public [ attestation_id ] } = Register_ecdsaWithSHA1Encryption(43, 6, 320, 16, 7);
