pragma circom 2.1.5;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "@zk-email/circuits/lib/rsa.circom";
include "binary-merkle-root.circom";
include "./utils/splitBytesToWords.circom";
include "./utils/splitSignalsToWords.circom";
include "./utils/Sha1Bytes.circom";


template DSC_sha1WithRSAEncryption(max_cert_bytes, n_dsc, k_dsc, n_csca, k_csca, dsc_mod_len, nLevels ) {
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

    verify the leaf
    component poseidon16first = Poseidon(16);
    component poseidon16next = Poseidon(16);
    component poseidon2last = Poseidon(2);
    component poseidonfinal = Poseidon(3);
    for (var i = 0; i < 16; i++) {
        poseidon16first.inputs[i] <== csca_modulus[i];
        poseidon16next.inputs[i] <== csca_modulus[i+16];
    }
    poseidon2last.inputs[0] <== csca_modulus[32];
    poseidon2last.inputs[1] <== csca_modulus[33];
    poseidonfinal.inputs[0] <== poseidon16first.out;
    poseidonfinal.inputs[1] <== poseidon16next.out;
    poseidonfinal.inputs[2] <== poseidon2last.out;
    signal leaf <== poseidonfinal.out;


    signal computed_merkle_root <== BinaryMerkleRoot(nLevels)(leaf, nLevels, path, siblings);
    merkle_root === computed_merkle_root;

    // variables verification
    assert(max_cert_bytes % 64 == 0);
    assert(n_csca * k_csca > max_cert_bytes);
    assert(n_csca <= (255 \ 2));

    // hash raw TBS certificate
    signal sha[160] <== Sha1Bytes(max_cert_bytes)(raw_dsc_cert, raw_dsc_cert_padded_bytes);
    component b2n = Bits2Num(160);
    for (var i = 0; i < 160; i++) {
        b2n.in[i] <== sha[159-i];
    }

    signal sha_bigint <== b2n.out;
    log("sha_bigint", sha_bigint);


    var msg_len = (160 + n_csca)\n_csca;
    log("msg_len", msg_len);
    
    component base_msg[msg_len];
    for (var i = 0; i < msg_len; i++) {
        base_msg[i] = Bits2Num(n_csca);
    }
    for (var i = 0; i < 160; i++) {
        base_msg[i\n_csca].in[i%n_csca] <== sha[160 - 1 - i];
    }
    for (var i = 160; i < n_csca*msg_len; i++) {
        base_msg[i\n_csca].in[i%n_csca] <== 0;
    }

    //verify RSA dsc_signature
    component rsa = RSAVerifier65537(n_csca, k_csca);
    for (var i = 0; i < msg_len; i++) {
        rsa.message[i] <== base_msg[i].out;
    }
    for (var i = msg_len; i < k_csca; i++) {
        rsa.message[i] <== 0;
    }
    for (var i = 0; i < k_csca; i++) {
        rsa.modulus[i] <== csca_modulus[i];
    }
    for (var i = 0; i < k_csca; i++) {
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
    component spbt_2 = SplitSignalsToWords(n_dsc,k_dsc, 230, 9);
    spbt_2.in <== dsc_modulus;
    component poseidon = Poseidon(10);
    poseidon.inputs[0] <== secret;
    for (var i = 0; i < 9; i++) {
        poseidon.inputs[i+1] <== spbt_2.out[i];
    }
    blinded_dsc_commitment <== poseidon.out;
}

