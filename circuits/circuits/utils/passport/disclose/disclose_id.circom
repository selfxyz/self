pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../date/isOlderThan.circom";
include "../ofac/ofac_name_dob_id.circom";
include "../ofac/ofac_name_yob_id.circom";
include "../../aadhaar/disclose/country_not_in_list.circom";

/// @notice Disclosure circuit — used after user registration
/// @param MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH Maximum number of countries present in the forbidden countries list
/// @input dg1 Data group 1 of the passport
/// @input selector_dg1 bitmap used which bytes from the dg1 are revealed
/// @input majority Majority user wants to prove he is older than: YY — ASCII
/// @input current_date Current date: YYMMDD — number
/// @input selector_older_than bitmap used to reveal the majority
/// @input forbidden_countries_list Forbidden countries list user wants to prove he is not from
/// @input smt_leaf_key value of the leaf of the smt corresponding to his path
/// @input smt_root root of the smt
/// @input smt_siblings siblings of the smt
/// @input selector_ofac bitmap used to reveal the OFAC verification result
/// @output revealedData_packed Packed revealed data
/// @output forbidden_countries_list_packed Packed forbidden countries list
template DISCLOSE_ID(
    MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH,
    namedobTreeLevels,
    nameyobTreeLevels
) {

    signal input dg1[95];
    signal input selector_dg1[90];

    signal input majority[2];
    signal input current_date[6];
    signal input selector_older_than;

    signal input forbidden_countries_list[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3];


    signal input ofac_namedob_smt_leaf_key;
    signal input ofac_namedob_smt_root;
    signal input ofac_namedob_smt_siblings[namedobTreeLevels];

    signal input ofac_nameyob_smt_leaf_key;
    signal input ofac_nameyob_smt_root;
    signal input ofac_nameyob_smt_siblings[nameyobTreeLevels];

    signal input selector_ofac;

    // assert selectors are 0 or 1
    for (var i = 0; i < 90; i++) {
        selector_dg1[i] * (selector_dg1[i] - 1) === 0;
    }
    selector_older_than * (selector_older_than - 1) === 0;
    selector_ofac * (selector_ofac - 1) === 0;

    // Older than
    component isOlderThan = IsOlderThan();
    isOlderThan.majorityASCII <== majority;
    for (var i = 0; i < 6; i++) {
        isOlderThan.currDate[i] <== current_date[i];
        isOlderThan.birthDateASCII[i] <== dg1[35 + i];
    }

    signal older_than_verified[2];
    older_than_verified[0] <== isOlderThan.out * majority[0];
    older_than_verified[1] <== isOlderThan.out * majority[1];

    signal revealedData[94]; // mrz: 90 bytes | older_than: 2 bytes | ofac: 2 byte
    for (var i = 0; i < 90; i++) {
        revealedData[i] <== dg1[5+i] * selector_dg1[i];
    }

    revealedData[90] <== older_than_verified[0] * selector_older_than;
    revealedData[91] <== older_than_verified[1] * selector_older_than;

    signal ofacCheckResultNameDob <== OFAC_NAME_DOB_ID(namedobTreeLevels)(
        dg1,
        ofac_namedob_smt_leaf_key,
        ofac_namedob_smt_root,
        ofac_namedob_smt_siblings
    );

    signal ofacCheckResultNameYob <== OFAC_NAME_YOB_ID(nameyobTreeLevels)(
        dg1,
        ofac_nameyob_smt_leaf_key,
        ofac_nameyob_smt_root,
        ofac_nameyob_smt_siblings
    );
    revealedData[92] <== ofacCheckResultNameDob * selector_ofac;
    revealedData[93] <== ofacCheckResultNameYob * selector_ofac;
    signal output revealedData_packed[4] <== PackBytes(94)(revealedData);

    var chunkLength = computeIntChunkLength(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3);
    component proveCountryIsNotInList = CountryNotInList(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH);
    proveCountryIsNotInList.country[0] <== dg1[7];
    proveCountryIsNotInList.country[1] <== dg1[8];
    proveCountryIsNotInList.country[2] <== dg1[9];
    proveCountryIsNotInList.forbidden_countries_list <== forbidden_countries_list;
    signal output forbidden_countries_list_packed[chunkLength] <== proveCountryIsNotInList.forbidden_countries_list_packed;
}
