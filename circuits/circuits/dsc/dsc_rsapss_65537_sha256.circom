pragma circom 2.1.5;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "@zk-email/circuits/lib/sha.circom";
include "binary-merkle-root.circom";
include "../utils/splitBytesToWords.circom";
include "../utils/splitSignalsToWords.circom";
include "../utils/RSASSAPSS_padded.circom";
include "../utils/leafHasher.circom";


template DSC_RSAPSS_65537_SHA256(max_cert_bytes, n_dsc, k_dsc, n_csca, k_csca, dsc_mod_len, nLevels ) {
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

    // verify the leaf
    component leafHasher = LeafHasher(n_csca,k_csca);
    leafHasher.in <== csca_modulus;
    signal leaf <== leafHasher.out;

    signal computed_merkle_root <== BinaryMerkleRoot(nLevels)(leaf, nLevels, path, siblings);
    merkle_root === computed_merkle_root;

    // variables verification
    assert(max_cert_bytes % 64 == 0);
    assert(n_csca * k_csca > max_cert_bytes);
    assert(n_csca <= (255 \ 2));

    // decode signature to get encoded message
    component rsaDecode = RSASSAPSS_Decode(n_csca, k_csca);
    rsaDecode.signature <== dsc_signature;
    rsaDecode.modulus <== csca_modulus;
    var emLen = div_ceil(n_csca * k_csca, 8);
    signal encodedMessage[emLen] <== rsaDecode.eM;

    component rsaVerify = RSASSAPSSVerify_SHA256(n_csca * k_csca, max_cert_bytes);
    rsaVerify.eM <== encodedMessage;
    rsaVerify.message <== raw_dsc_cert;
    rsaVerify.messagePaddedLen <== raw_dsc_cert_padded_bytes;

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
    component sstw_1 = SplitSignalsToWords(n_dsc,k_dsc, 230, 9);
    sstw_1.in <== dsc_modulus;
    component poseidon = Poseidon(10);
    poseidon.inputs[0] <== secret;
    for (var i = 0; i < 9; i++) {
        poseidon.inputs[i+1] <== sstw_1.out[i];
    }
    blinded_dsc_commitment <== poseidon.out;
}

