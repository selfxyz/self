pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../utils/passport/customHashers.circom";
include "../utils/kyc/disclose/disclose.circom";

/// @title VC_AND_DISCLOSE_KYC
/// @notice Combines verifiable credential verification with KYC disclosure, validating data against a merkle tree and performing comprehensive compliance checks
/// @param MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH Maximum number of countries in the forbidden countries list
/// @param namedobTreeLevels Depth of the sparse merkle tree for OFAC name+DOB verification
/// @param nameyobTreeLevels Depth of the sparse merkle tree for OFAC name+YOB verification
/// @param nLevels Depth of the binary merkle tree for credential verification
/// @input data_padded The padded KYC data containing all document fields
/// @input compressed_disclose_sel Two-element array representing compressed disclosure selector
/// @input scope Application-specific scope identifier for nullifier generation
/// @input forbidden_countries_list Flat array of forbidden country codes
/// @input merkle_root Root of the binary merkle tree for credential verification
/// @input leaf_depth Depth of the leaf in the merkle tree
/// @input path Binary path to the leaf in the merkle tree
/// @input siblings Sibling nodes for merkle proof verification
/// @input ofac_name_dob_smt_leaf_key Leaf key for OFAC name+DOB sparse merkle tree verification
/// @input ofac_name_dob_smt_root Root of the OFAC name+DOB sparse merkle tree
/// @input ofac_name_dob_smt_siblings Sibling nodes for OFAC name+DOB merkle proof
/// @input ofac_name_yob_smt_leaf_key Leaf key for OFAC name+YOB sparse merkle tree verification
/// @input ofac_name_yob_smt_root Root of the OFAC name+YOB sparse merkle tree
/// @input ofac_name_yob_smt_siblings Sibling nodes for OFAC name+YOB merkle proof
/// @input selector_ofac Binary selector to enable/disable OFAC checks (0 or 1)
/// @input user_identifier Unique identifier for the user
/// @input current_date Current date in YYYYMMDD format
/// @input majority_age_ASCII Age threshold for majority verification (ASCII encoded, 3 digits)
/// @input secret Secret value used for leaf generation and nullifier computation
/// @input attestation_id Unique identifier for this attestation
/// @output revealedData_packed Packed array containing selectively revealed data fields and verification results
/// @output forbidden_countries_list_packed Packed representation of the forbidden countries list
/// @output nullifier Unique nullifier derived from secret and scope to prevent double-spending
/// @dev Verifies the credential against a binary merkle tree
/// @dev The compressed_disclose_sel is split into two 133-bit values and reconstructed into a selector array
/// @dev TODO: we can pass majority_age(number) rather than majority_age_ASCII which will save few constraints, but kept it for now to match with other circuits

template VC_AND_DISCLOSE_KYC(
    MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH,
    namedobTreeLevels,
    nameyobTreeLevels,
    nLevels
) {
    var max_length = KYC_MAX_LENGTH();
    var country_length = COUNTRY_LENGTH();
    var id_number_length = ID_NUMBER_LENGTH();
    var idNumberIdx = ID_NUMBER_INDEX();
    var compressed_bit_len = max_length/2;

    signal input data_padded[max_length];
    signal input compressed_disclose_sel[2];

    signal input scope;

    signal input forbidden_countries_list[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * country_length];

    signal input merkle_root;
    signal input leaf_depth;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input ofac_name_dob_smt_leaf_key;
    signal input ofac_name_dob_smt_root;
    signal input ofac_name_dob_smt_siblings[namedobTreeLevels];

    signal input ofac_name_yob_smt_leaf_key;
    signal input ofac_name_yob_smt_root;
    signal input ofac_name_yob_smt_siblings[nameyobTreeLevels];

    signal input selector_ofac;
    signal input user_identifier;
    signal input current_date[8];
    signal input majority_age_ASCII[3];
    signal input secret;

    // Convert the two decimal inputs back to bit array
    signal disclose_sel[max_length];

    // Convert disclose_sel_low (first 133 bits) to bit array
    component low_bits = Num2Bits(compressed_bit_len);
    low_bits.in <== compressed_disclose_sel[0];

    // Convert disclose_sel_high (next 133 bits) to bit array
    component high_bits = Num2Bits(compressed_bit_len);
    high_bits.in <== compressed_disclose_sel[1];

    // Combine the bit arrays (little-endian format)
    for(var i = 0; i < compressed_bit_len; i++){
        disclose_sel[i] <== low_bits.out[i];
    }
    for(var i = 0; i < compressed_bit_len; i++){
        disclose_sel[compressed_bit_len + i] <== high_bits.out[i];
    }

    component msg_hasher = PackBytesAndPoseidon(max_length);
    for (var i = 0; i < max_length; i++) {
        msg_hasher.in[i] <== data_padded[i];
    }

    signal leaf <== Poseidon(2)([secret, msg_hasher.out]);

    signal computedRoot <== BinaryMerkleRoot(nLevels)(leaf, leaf_depth, path, siblings);
    merkle_root === computedRoot;

    component disclose_circuit = DISCLOSE_KYC(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH, namedobTreeLevels, nameyobTreeLevels);

    for (var i = 0; i < max_length; i++) {
        disclose_circuit.data_padded[i] <== data_padded[i];
    }
    disclose_circuit.selector_data_padded <== disclose_sel;
    disclose_circuit.forbidden_countries_list <== forbidden_countries_list;

    disclose_circuit.ofac_name_dob_smt_leaf_key <== ofac_name_dob_smt_leaf_key;
    disclose_circuit.ofac_name_dob_smt_root <== ofac_name_dob_smt_root;
    disclose_circuit.ofac_name_dob_smt_siblings <== ofac_name_dob_smt_siblings;

    disclose_circuit.ofac_name_yob_smt_leaf_key <== ofac_name_yob_smt_leaf_key;
    disclose_circuit.ofac_name_yob_smt_root <== ofac_name_yob_smt_root;
    disclose_circuit.ofac_name_yob_smt_siblings <== ofac_name_yob_smt_siblings;

    disclose_circuit.selector_ofac <== selector_ofac;
    disclose_circuit.current_date <== current_date;
    disclose_circuit.majority_age_ASCII <== majority_age_ASCII;

    var revealed_data_packed_chunk_length = computeIntChunkLength(max_length + 2 + 1);
    signal output revealedData_packed[revealed_data_packed_chunk_length] <== disclose_circuit.revealedData_packed;

    var forbidden_countries_list_packed_chunk_length = computeIntChunkLength(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * country_length);
    signal output forbidden_countries_list_packed[forbidden_countries_list_packed_chunk_length] <== disclose_circuit.forbidden_countries_list_packed;
    signal output nullifier <== Poseidon(2)([secret, scope]);
    signal output attestation_id <== 4;
}
