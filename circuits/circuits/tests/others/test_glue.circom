pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "../../utils/crypto/hasher/shaBytes/shaBytesDynamic.circom";
include "circomlib/circuits/comparators.circom";
include "../../utils/crypto/hasher/hash.circom";
include "circomlib/circuits/poseidon.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "../../utils/passport/customHashers.circom";
include "../../utils/passport/signatureAlgorithm.circom";
include "../../utils/passport/signatureVerifier.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../../utils/crypto/bitify/bytes.circom";
include "../../utils/crypto/utils/WordToBytes.circom";



template HashComputationTest(kLengthFactor, n, k, kScaled) {
    // Constants from original circuits
    // var n = 120;
    // var k = 35; 
    var maxPubkeyBytesLength = 525;    
    // Inputs
    signal input pubKey_dsc[kScaled];
    signal input pubkey_dsc_padded[maxPubkeyBytesLength];
    signal input salt;
    signal input pubKey_csca_hash;

    ///////////////////////////////////////////////////////////
    // Compute hash using register.circom approach
    signal register_hash;
    if (kLengthFactor == 1) {
        assert(k == 35);
        assert(n == 120);

        //conver to 8 bits
        component dsc_bytes = WordsToBytes(n, k, (n * k ) / 8);
        dsc_bytes.words <== pubKey_dsc;

        //convert to n = 120, k = 35
        component splitToWords = SplitBytesToWords((n * k) / 8, 120, 35);
        splitToWords.in <== dsc_bytes.bytes;

        signal dsc_words[70];
        for (var i=0; i < 70; i++) {
            if (i < 35) {
                dsc_words[i] <== splitToWords.out[i];
            } else {
                dsc_words[i] <== 0;
            }
        }

        // Compute hash
        register_hash <== CustomHasher(70)(dsc_words);
    } else if (kLengthFactor == 2) {
        //convert words to bytes (8 bits)
        component dsc_bytes_x = WordsToBytes(n, k, (n * k) / 8);
        component dsc_bytes_y = WordsToBytes(n, k, (n * k) / 8);

        for (var i=0; i < k; i++) {
            dsc_bytes_y.words[i] <== pubKey_dsc[i];
            dsc_bytes_x.words[i] <== pubKey_dsc[i + k];
        }

        //convert to n = 120, k = 35
        component splitToWords = SplitBytesToWords(maxPubkeyBytesLength, 120, 35);
        for (var i=0; i < 525; i++) {
            if (i < n * k / 8) {
                splitToWords.in[i] <== dsc_bytes_x.bytes[i];
            } else if (i < n * k / 4) {
                splitToWords.in[i] <== dsc_bytes_y.bytes[i - n * k / 8];
            } else {
                splitToWords.in[i] <== 0;
            }
        }
        signal dsc_words[70];
        for (var i=0; i < 70; i++) {
            if (i < 35) {
                dsc_words[i] <== splitToWords.out[i];
            } else {
                dsc_words[i] <== 0;
            }
        }
        register_hash <== CustomHasher(70)(dsc_words);
    }
    
    
    ///////////////////////////////////////////////////////////////////////////
    // Compute hash using dsc.circom approach
    signal dsc_hash;
    var n_dsc = 120; //new word bits
    var k_dsc = 35; //new word count
    
    component splitToWords_dsc = SplitBytesToWords(maxPubkeyBytesLength, n_dsc, k_dsc);
    splitToWords_dsc.in <== pubkey_dsc_padded;
    signal dsc_pubkey_words[70];
    for (var i=0; i < k_dsc * 2; i++) {
        if (i < k_dsc) {
            dsc_pubkey_words[i] <== splitToWords_dsc.out[i];
        } else {
            dsc_pubkey_words[i] <== 0;
        }
    }
    dsc_hash <== CustomHasher(70)(dsc_pubkey_words);
    register_hash === dsc_hash;

    // Compute glue values
    signal register_glue <== Poseidon(4)([salt, kScaled, register_hash, pubKey_csca_hash]);
    signal dsc_glue <== Poseidon(4)([salt, kScaled, dsc_hash, pubKey_csca_hash]);

    // Verify glue values match
    register_glue === dsc_glue;
}