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
include "../utils/passport/checkPubkeysEqual.circom";
include "../utils/passport/constants.circom";
include "../utils/crypto/bitify/bytes.circom";

/// @title DSC
/// @notice Circuit for verifying DSC certificate signature using CSCA certificate
/// @param signatureAlgorithm Algorithm used for DSC signature verification - contains the information about the final hash algorithm
/// @param n_csca Number of bits per chunk the CSCA key is split into
/// @param k_csca Number of chunks the CSCA key is split into
/// @input raw_csca Raw CSCA certificate data
/// @input raw_csca_actual_length Actual length of CSCA certificate
/// @input csca_pubKey_offset Offset of CSCA public key in certificate
/// @input csca_pubKey_actual_size Actual size of CSCA public key
/// @input raw_dsc Raw DSC certificate data
/// @input raw_dsc_actual_length Actual length of DSC certificate
/// @input csca_pubKey CSCA public key for signature verification
/// @input signature DSC signature
/// @input merkle_root Root of CSCA Merkle tree
/// @input path Path indices for CSCA Merkle proof
/// @input siblings Sibling hashes for CSCA Merkle proof
/// @output dsc_tree_leaf Leaf to be added to the DSC Merkle tree
template DSC(
    signatureAlgorithm,
    n_csca,
    k_csca
) {
    var MAX_CSCA_LENGTH = getMaxCSCALength();
    var MAX_DSC_LENGTH = getMaxDSCLength();
    var nLevels = getMaxCSCALevels();

    // variables verification
    assert(MAX_CSCA_LENGTH % 64 == 0);
    assert(MAX_DSC_LENGTH % 64 == 0);
    // assert(n_csca * k_csca > max_dsc_bytes); // not sure what this is for
    assert(n_csca <= (255 \ 2));

    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k_csca * kLengthFactor;
    var hashLength = getHashLength(signatureAlgorithm);

    var MAX_CSCA_PUBKEY_LENGTH = n_csca * kScaled / 8;

    signal input raw_csca[MAX_CSCA_LENGTH];
    signal input raw_csca_actual_length;
    signal input csca_pubKey_offset;
    signal input csca_pubKey_actual_size;

    signal input raw_dsc[MAX_DSC_LENGTH];
    signal input raw_dsc_actual_length;

    signal input csca_pubKey[kScaled];
    signal input signature[kScaled];

    signal input merkle_root;
    signal input path[nLevels];
    signal input siblings[nLevels];

    // check raw_csca_actual_length is valid by checking that it is a 255 in the CSCA, and all bytes after it are 0s
    // NOTE: not sure it's necessary to check for more than raw_csca[raw_csca_actual_length - 1] !== 0, as selecting any position
    // before the actual length would only constrain the pubkey range more
    // NOTE: could be handled differently by including raw_csca_actual_length in the csca merkle tree,
    // instead of passing it as a private input
    component byte_checks[MAX_CSCA_LENGTH];
    component isEqualChecks[MAX_CSCA_LENGTH];
    for (var i = 0; i < MAX_CSCA_LENGTH; i++) {
        byte_checks[i] = GreaterThan(32);
        byte_checks[i].in[0] <== i;
        byte_checks[i].in[1] <== raw_csca_actual_length;
        
        // If i >= raw_csca_actual_length, the byte must be 0
        raw_csca[i] * byte_checks[i].out === 0;

        isEqualChecks[i] = IsEqual();
        isEqualChecks[i].in[0] <== raw_csca_actual_length - 1;
        isEqualChecks[i].in[1] <== i;

        // If i == raw_csca_actual_length - 1, the byte must be 255
        (raw_csca[i] - 255) * isEqualChecks[i].out === 0;
    }

    // check offsets refer to valid ranges
    signal csca_pubKey_offset_in_range <== LessEqThan(12)([
        csca_pubKey_offset + csca_pubKey_actual_size,
        raw_csca_actual_length
    ]); 
    csca_pubKey_offset_in_range === 1;

    // compute leaf in the CSCA Merkle tree and verify inclusion
    signal csca_hash <== PackBytesAndPoseidon(MAX_CSCA_LENGTH)(raw_csca);
    signal computed_merkle_root <== BinaryMerkleRoot(nLevels)(csca_hash, nLevels, path, siblings);
    merkle_root === computed_merkle_root;

    // get CSCA public key from the certificate
    signal extracted_csca_pubKey[MAX_CSCA_PUBKEY_LENGTH] <== SelectSubArray(MAX_CSCA_LENGTH, MAX_CSCA_PUBKEY_LENGTH)(
        raw_csca,
        csca_pubKey_offset,
        csca_pubKey_actual_size
    );

    // check if the CSCA public key is the same as the one in the certificate
    // If we end up adding the pubkey in the CSCA leaf, we'll be able to remove this check
    CheckPubkeysEqual(n_csca, kScaled, kLengthFactor, MAX_CSCA_PUBKEY_LENGTH)(
        csca_pubKey,
        extracted_csca_pubKey,
        csca_pubKey_actual_size
    );

    // verify DSC signature
    // we don't check that raw_dsc_actual_length is the correct one currently
    // because we assume it would give hashes for which no signatures can be produced
    signal hashedCertificate[hashLength] <== ShaBytesDynamic(hashLength, MAX_DSC_LENGTH)(raw_dsc, raw_dsc_actual_length);
    SignatureVerifier(signatureAlgorithm, n_csca, k_csca)(hashedCertificate, csca_pubKey, signature);
    
    // generate DSC leaf as poseidon(csca_hash, dsc_hash)
    signal dsc_hash <== PackBytesAndPoseidon(MAX_DSC_LENGTH)(raw_dsc);
    signal output dsc_tree_leaf <== Poseidon(2)([dsc_hash, csca_hash]);
}