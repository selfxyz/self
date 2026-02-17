pragma circom 2.1.9;

include "./ofac/ofac_name_dob_kyc.circom";
include "./ofac/ofac_name_yob_kyc.circom";
include "../../aadhaar/disclose/country_not_in_list.circom";
include "circomlib/circuits/comparators.circom";
include "../date/isValid.circom";
include "../date/isOlderThan.circom";
include "../constants.circom";

/// @title DISCLOSE_KYC
/// @notice Performs comprehensive KYC verification including OFAC checks, age verification, document validity, and country restrictions
/// @param MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH Maximum number of countries in the forbidden countries list
/// @param name_dob_tree_levels Depth of the sparse merkle tree for OFAC name+DOB verification
/// @param name_yob_tree_levels Depth of the sparse merkle tree for OFAC name+YOB verification
/// @input data_padded The padded KYC data containing all document fields (country, expiration date, DOB, etc.)
/// @input selector_data_padded Selector array to control which fields from data_padded are revealed
/// @input forbidden_countries_list Flat array of forbidden country codes
/// @input ofac_name_dob_smt_leaf_key Leaf key for OFAC name+DOB sparse merkle tree verification
/// @input ofac_name_dob_smt_root Root of the OFAC name+DOB sparse merkle tree
/// @input ofac_name_dob_smt_siblings Sibling nodes for OFAC name+DOB merkle proof
/// @input ofac_name_yob_smt_leaf_key Leaf key for OFAC name+YOB sparse merkle tree verification
/// @input ofac_name_yob_smt_root Root of the OFAC name+YOB sparse merkle tree
/// @input ofac_name_yob_smt_siblings Sibling nodes for OFAC name+YOB merkle proof
/// @input selector_ofac Binary selector to enable/disable OFAC checks (0 or 1)
/// @input current_date Current date in YYYYMMDD format )
/// @input majority_age_ASCII Age threshold for majority verification (ASCII encoded, 3 digits)
/// @output forbidden_countries_list_packed Packed representation of the forbidden countries list
/// @output revealedData_packed Packed array containing selectively revealed data fields and verification results
/// @dev The output includes OFAC check results, age verification result, and selectively disclosed document fields
/// @dev selector_ofac must be binary (0 or 1) and is constrained

template DISCLOSE_KYC(
    MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH,
    name_dob_tree_levels,
    name_yob_tree_levels
) {
    var max_length = KYC_MAX_LENGTH();
    var country_length = COUNTRY_LENGTH();
    var country_index = COUNTRY_INDEX();
    var expiration_date_length = EXPIRATION_DATE_LENGTH();
    var expiration_date_index = EXPIRATION_DATE_INDEX();
    var dob_length = DOB_LENGTH();
    var dob_index = DOB_INDEX();


    signal input data_padded[max_length];
    signal input selector_data_padded[max_length];

    signal input forbidden_countries_list[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * country_length];

    signal input ofac_name_dob_smt_leaf_key;
    signal input ofac_name_dob_smt_root;
    signal input ofac_name_dob_smt_siblings[name_dob_tree_levels];

    signal input ofac_name_yob_smt_leaf_key;
    signal input ofac_name_yob_smt_root;
    signal input ofac_name_yob_smt_siblings[name_yob_tree_levels];

    signal input selector_ofac;
    signal input current_date[8];
    signal input majority_age_ASCII[3];

    selector_ofac * (selector_ofac - 1) === 0;


    signal validity_ASCII[8];
    for (var i = 0; i < expiration_date_length ; i++) {
        validity_ASCII[i] <== data_padded[expiration_date_index + i];
    }
    IsValidFullYear()(current_date, validity_ASCII);

    signal birth_date_ASCII[8];
    for (var i = 0; i < dob_length ; i++) {
        birth_date_ASCII[i] <== data_padded[dob_index + i];
    }

    component is_older_than = IsOlderThan();
    is_older_than.majorityASCII <== majority_age_ASCII;
    is_older_than.currDate <== current_date;
    is_older_than.birthDateASCII <== birth_date_ASCII;

    component ofac_name_dob_circuit = OFAC_NAME_DOB_KYC(name_dob_tree_levels);
    ofac_name_dob_circuit.data_padded <== data_padded;
    ofac_name_dob_circuit.smt_leaf_key <== ofac_name_dob_smt_leaf_key;
    ofac_name_dob_circuit.smt_root <== ofac_name_dob_smt_root;
    ofac_name_dob_circuit.smt_siblings <== ofac_name_dob_smt_siblings;

    component ofac_name_yob_circuit = OFAC_NAME_YOB_KYC(name_yob_tree_levels);
    ofac_name_yob_circuit.data_padded <== data_padded;
    ofac_name_yob_circuit.smt_leaf_key <== ofac_name_yob_smt_leaf_key;
    ofac_name_yob_circuit.smt_root <== ofac_name_yob_smt_root;
    ofac_name_yob_circuit.smt_siblings <== ofac_name_yob_smt_siblings;

    signal revealed_data[max_length + 2 + 1];
    for (var i = 0; i < max_length; i++) {
        revealed_data[i] <== data_padded[i] * selector_data_padded[i];
    }

    signal majority_age_100 <== (majority_age_ASCII[0] - 48) * 100;
    signal majority_age_10 <== (majority_age_ASCII[1] - 48) * 10;
    signal majority_age_1 <== majority_age_ASCII[2] - 48;
    signal majority_age <== majority_age_100 + majority_age_10 + majority_age_1;

    component lessThan256 = LessThan(8);
    lessThan256.in[0] <== majority_age;
    lessThan256.in[1] <== 255;
    lessThan256.out === 1;

    revealed_data[max_length] <== ofac_name_dob_circuit.ofacCheckResult * selector_ofac;
    revealed_data[max_length + 1] <== ofac_name_yob_circuit.ofacCheckResult * selector_ofac;
    revealed_data[max_length + 2] <== is_older_than.out * majority_age;

    component country_not_in_list_circuit = CountryNotInList(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH);

    for (var i = 0; i < country_length; i++) {
        country_not_in_list_circuit.country[i] <== data_padded[country_index + i];
    }
    country_not_in_list_circuit.forbidden_countries_list <== forbidden_countries_list;

    var chunkLength = computeIntChunkLength(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * country_length);
    signal output forbidden_countries_list_packed[chunkLength] <== country_not_in_list_circuit.forbidden_countries_list_packed;

    var revealed_data_packed_chunk_length = computeIntChunkLength(max_length + 2 + 1);
    signal output revealedData_packed[revealed_data_packed_chunk_length] <== PackBytes(max_length + 2 + 1)(revealed_data);
}
