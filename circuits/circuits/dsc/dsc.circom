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
include "../utils/crypto/utils/WordToBytes.circom";

///@input dsc_pubKey public key of the DSC in bytes padded to 525 bytes 
template DSC(signatureAlgorithm, n_csca, k_csca, max_cert_bytes, nLevels) {
    var maxPubkeyBytesLength = 525;
   
    // variables verification
    assert(max_cert_bytes % 64 == 0);
    // assert(n_csca * k_csca > max_cert_bytes);
    assert(n_csca <= (255 \ 2));

    var hashLength = getHashLength(signatureAlgorithm);
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k_csca * kLengthFactor;

    signal input raw_dsc_cert[max_cert_bytes];
    signal input raw_dsc_cert_padded_bytes;
    signal input csca_pubKey[kScaled];
    signal input signature[kScaled];
    signal input dsc_pubKey[maxPubkeyBytesLength];
    signal input dsc_pubKey_offset;
    signal input dsc_pubkey_length_bytes;
    signal input secret;
    signal input merkle_root;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input oid_index;
    signal input oid_length;


    component select_oid = SelectSubArray(max_cert_bytes, 11);
    select_oid.in <== raw_dsc_cert;
    select_oid.startIndex <== oid_index;
    select_oid.length <== oid_length;

    component oid_check = OidCheck(11);
    oid_check.oid_input <== select_oid.out;
    oid_check.oid_length <== oid_length;

    //should be either rsa or ecdsa
    oid_check.is_rsa + oid_check.is_ecdsa === 1;
    
    AssertValidKeyLength()(dsc_pubkey_length_bytes, oid_check.is_rsa, oid_check.is_ecdsa);

    // leaf
    signal leaf  <== CustomHasher(kScaled)(csca_pubKey);

    signal computed_merkle_root <== BinaryMerkleRoot(nLevels)(leaf, nLevels, path, siblings);
    merkle_root === computed_merkle_root;
    
    // verify certificate signature
    signal hashedCertificate[hashLength] <== ShaBytesDynamic(hashLength, max_cert_bytes)(raw_dsc_cert, raw_dsc_cert_padded_bytes);
    SignatureVerifier(signatureAlgorithm, n_csca, k_csca)(hashedCertificate, csca_pubKey, signature);
    
    signal extracted_pubkey[maxPubkeyBytesLength +1];
    signal raw_dsc_cert_reversed[max_cert_bytes];

    //reverse the certificate
    for (var i=0; i<max_cert_bytes; i++) {
        raw_dsc_cert_reversed[i] <== raw_dsc_cert[max_cert_bytes - 1 - i];
    }
    
    component shifter = VarShiftLeft(max_cert_bytes, maxPubkeyBytesLength);
    shifter.in <== raw_dsc_cert_reversed;
    // shifter.shift <== max_cert_bytes - dsc_pubKey_offset - dsc_pubkey_length_bytes;

    //for ecdsa, dsc_pubkey_length_bytes is x+y length
    shifter.shift <== (max_cert_bytes - dsc_pubKey_offset - dsc_pubkey_length_bytes) ;//- (isDSCEcdsa * dsc_pubkey_length_bytes);
    extracted_pubkey[maxPubkeyBytesLength] <== 0;
    for (var i=0; i<maxPubkeyBytesLength; i++) {
        extracted_pubkey[i] <== shifter.out[i];
    }
    component selectPubKkey = SelectSubArray(maxPubkeyBytesLength + 1, maxPubkeyBytesLength);
    selectPubKkey.in <== extracted_pubkey;
    selectPubKkey.startIndex <== 0;
    selectPubKkey.length <== dsc_pubkey_length_bytes;

    for (var i=0; i<maxPubkeyBytesLength; i++) {
        selectPubKkey.out[i] === dsc_pubKey[i];
    }
    //TODO Add glue
    // blinded dsc commitment
    // signal pubkeyHash <== CustomHasher(k_dsc_scaled)(dsc_pubKey);
    // signal output blinded_dsc_commitment <== Poseidon(2)([secret, pubkeyHash]);
}

template OidCheck(max_oid_length) {
    signal input oid_input[max_oid_length];
    signal input oid_length;
    signal output is_rsa;
    signal output is_ecdsa;

    // Common prefix for RSA family: 1.2.840.113549.1.1
    var rsa_prefix[7] = [42, 134, 72, 134, 247, 13, 1];
    // ecdsa OID prefix: 1.2.840.10045
    var ecdsa_prefix[5] = [42, 134, 72, 206, 61];


    //oid_input[0] has the tag
    //oid_input[1] has the length of the oid without tag and length bytes
    //oid_input[2] oid starts from here

    //tag should be 6
    signal tag_check <== IsEqual()([oid_input[0], 6]);
    tag_check === 1;

    //length check
    oid_input[1] === oid_length -2;

    signal comparators_rsa[7];
    signal comparators_ec[5];

    for (var i=0; i<7; i++) {
        comparators_rsa[i] <== IsEqual()([oid_input[i + 2], rsa_prefix[i]]);

        if (i < 5) {
            comparators_ec[i] <== IsEqual()([oid_input[i + 2], ecdsa_prefix[i]]);
        }
    }
    
    component and_rsa = AND();
    component and_temp_rsa[6];
    component and_ec = AND();
    component and_temp_ec[4];

    and_rsa.a <== comparators_rsa[0];
    and_rsa.b <== comparators_rsa[1];
    signal temp_rsa[6];
    temp_rsa[0] <== and_rsa.out;

    and_ec.a <== comparators_ec[0];
    and_ec.b <== comparators_ec[1];
    signal temp_ec[4];
    temp_ec[0] <== and_ec.out;
    
    for(var i = 2; i < 7; i++) {

        //RSA check
        and_temp_rsa[i-2] = AND();
        and_temp_rsa[i-2].a <== temp_rsa[i-2];
        and_temp_rsa[i-2].b <== comparators_rsa[i];
        if(i < 6) temp_rsa[i-1] <== and_temp_rsa[i-2].out;
        if(i == 6) is_rsa <== and_temp_rsa[i-2].out;

        //ECDSA check
        if (i < 5) {
            and_temp_ec[i-2] = AND();
            and_temp_ec[i-2].a <== temp_ec[i-2];
            and_temp_ec[i-2].b <== comparators_ec[i];
            if(i < 4) temp_ec[i-1] <== and_temp_ec[i-2].out;
            if(i == 4) is_ecdsa <== and_temp_ec[i-2].out;
        }
    }
}

template AssertValidKeyLength() {
    signal input pubkey_length_bytes;
    signal input is_rsa;
    signal input is_ecdsa;

    signal validKeyLength;
    signal isEcc224 <== IsEqual()([pubkey_length_bytes * 8, 224]);
    signal isEcc256 <== IsEqual()([pubkey_length_bytes * 8, 256]); 
    signal isEcc384 <== IsEqual()([pubkey_length_bytes * 8, 384]);
    signal isEcc512 <== IsEqual()([pubkey_length_bytes * 8, 512]);
    signal isEcc521 <== IsEqual()([pubkey_length_bytes * 8, 521]);
    signal isRsa2048 <== IsEqual()([pubkey_length_bytes * 8, 2048]);
    signal isRsa3072 <== IsEqual()([pubkey_length_bytes * 8, 3072]); 
    signal isRsa4096 <== IsEqual()([pubkey_length_bytes * 8, 4096]);

    // RSA valid lengths
    signal validRsaLength <== isRsa2048 + isRsa3072 + isRsa4096;
    
    // ECC valid lengths 
    signal validEccLength <== isEcc224 + isEcc256 + isEcc384 + isEcc512 + isEcc521;

    is_rsa + is_ecdsa === 1;

    // If is_rsa=1, require valid RSA length and no ECC length
    // If is_rsa=0, require valid ECC length and no RSA length
    // is_rsa * validRsaLength + (1-is_rsa) * validEccLength === 1;
    // is_rsa * validEccLength === 0;
    // (1-is_rsa) * validRsaLength === 0;

    signal validRsaTemp <== is_rsa * validRsaLength;
    signal validEccTemp <== is_ecdsa * validEccLength;
    
    signal invalidRsa <== is_ecdsa * validRsaLength;
    signal invalidEcc <== is_rsa * validEccLength;

    validRsaTemp + validEccTemp === 1;
    invalidRsa === 0;
    invalidEcc === 0;
}