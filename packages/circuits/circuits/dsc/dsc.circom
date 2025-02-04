pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "../utils/crypto/hasher/shaBytes/shaBytesDynamic.circom";
include "circomlib/circuits/comparators.circom";
include "../utils/crypto/hasher/hash.circom";
include "circomlib/circuits/poseidon.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "../utils/passport/customHashers.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/signatureVerifier.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../utils/crypto/bitify/bytes.circom";


template DSC(signatureAlgorithm, n_dsc, k_dsc, n_csca, k_csca, max_cert_bytes, dscPubkeyBytesLength, nLevels) {
   
    // variables verification
    assert(max_cert_bytes % 64 == 0);
    assert(n_csca * k_csca > max_cert_bytes);
    assert(n_csca <= (255 \ 2));

    var hashLength = getHashLength(signatureAlgorithm);
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k_csca * kLengthFactor;

    signal input raw_dsc_cert[max_cert_bytes]; 
    signal input raw_dsc_cert_padded_bytes;
    signal input csca_pubKey[kScaled];
    signal input signature[kScaled];
    signal input dsc_pubKey[k_dsc];
    signal input dsc_pubKey_offset;
    signal input secret;

    signal input merkle_root;
    signal input path[nLevels];
    signal input siblings[nLevels];


    // leaf
    signal leaf  <== LeafHasher(kScaled)(csca_pubKey, signatureAlgorithm);

    signal computed_merkle_root <== BinaryMerkleRoot(nLevels)(leaf, nLevels, path, siblings);
    merkle_root === computed_merkle_root;
    
    // verify certificate signature
    signal hashedCertificate[hashLength] <== ShaBytesDynamic(hashLength, max_cert_bytes)(raw_dsc_cert, raw_dsc_cert_padded_bytes);
    
    SignatureVerifier(signatureAlgorithm, n_csca, k_csca)(hashedCertificate, csca_pubKey, signature);

    // verify DSC csca_pubKey
    component shiftLeft = VarShiftLeft(max_cert_bytes, dscPubkeyBytesLength); // use select subarray for dscPubKey variable length 
    shiftLeft.in <== raw_dsc_cert;
    shiftLeft.shift <== dsc_pubKey_offset;
    component spbt_1 = SplitBytesToWords(dscPubkeyBytesLength, n_dsc, k_dsc);
    spbt_1.in <== shiftLeft.out;
    for (var i = 0; i < k_dsc; i++) {
        dsc_pubKey[i] === spbt_1.out[i];
    }

    // blinded dsc commitment
    signal pubkeyHash <== CustomHasher(k_dsc)(dsc_pubKey);
    signal output blinded_dsc_commitment <== Poseidon(2)([secret, pubkeyHash]);
}

