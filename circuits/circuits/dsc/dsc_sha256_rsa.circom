pragma circom 2.1.5;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "@zk-email/circuits/lib/sha.circom";
include "@zk-email/circuits/lib/rsa.circom";
include "binary-merkle-root.circom";
include "../utils/splitBytesToWords.circom";
include "../utils/splitSignalsToWords.circom";
include "../utils/leafHasher.circom";
include "../utils/leafHasher.circom";

template DSC_SHA256_RSA(max_cert_bytes, n_dsc, k_dsc, n_csca, k_csca, dsc_mod_len, nLevels ) {
    signal input raw_dsc_cert[max_cert_bytes]; 
    signal input raw_dsc_cert_padded_bytes;
    signal input csca_modulus[k_csca];
    signal input dsc_signature[k_csca];
    signal input dsc_modulus[k_dsc];
    signal input start_index;
    signal input secret;

    signal input merkle_root;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal output blinded_dsc_commitment;

    component leafHasher = LeafHasher(n_csca,k_csca);
    leafHasher.in <== csca_modulus;
    signal leaf <== leafHasher.out;


    signal computed_merkle_root <== BinaryMerkleRoot(nLevels)(leaf, nLevels, path, siblings);
    merkle_root === computed_merkle_root;

    // variables verification
    assert(max_cert_bytes % 64 == 0);
    assert(n_csca * k_csca > max_cert_bytes);
    assert(n_csca <= (255 \ 2));

    // hash raw TBS certificate
    signal sha[256] <== Sha256Bytes(max_cert_bytes)(raw_dsc_cert, raw_dsc_cert_padded_bytes);
    component sstw_1 = SplitSignalsToWords(1,256, n_csca, k_csca);
    for (var i = 0; i < 256; i++) {
        sstw_1.in[i] <== sha[255 - i];
    }

    // verify RSA dsc_signature
    component rsa = RSAVerifier65537(n_csca, k_csca);
    for (var i = 0; i < k_csca; i++) {
        rsa.message[i] <== sstw_1.out[i];
        rsa.modulus[i] <== csca_modulus[i];
        rsa.signature[i] <== dsc_signature[i];
    }

    // verify DSC csca_modulus
    component shiftLeft = VarShiftLeft(max_cert_bytes, dsc_mod_len);
    shiftLeft.in <== raw_dsc_cert;
    shiftLeft.shift <== start_index;
    component spbt_1 = SplitBytesToWords(dsc_mod_len, n_dsc, k_dsc);
    spbt_1.in <== shiftLeft.out;
    for (var i = 0; i < k_dsc; i++) {
        dsc_modulus[i] === spbt_1.out[i];
    }
    // generate blinded commitment
    component sstw_2 = SplitSignalsToWords(n_dsc,k_dsc, 230, 9);
    sstw_2.in <== dsc_modulus;
    component poseidon = Poseidon(10);
    poseidon.inputs[0] <== secret;
    for (var i = 0; i < 9; i++) {
        poseidon.inputs[i+1] <== sstw_2.out[i];
    }
    blinded_dsc_commitment <== poseidon.out;
}

