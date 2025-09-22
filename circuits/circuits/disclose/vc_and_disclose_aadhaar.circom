pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "../utils/aadhaar/disclose/verify_commitment.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../utils/aadhaar/extractQrData.circom";
include "../utils/aadhaar/ofac/ofac_name_dob.circom";
include "../utils/aadhaar/ofac/ofac_name_yob.circom";
include "../utils/aadhaar/disclose/country_not_in_list.circom";

/// @title VC_AND_DISCLOSE_Aadhaar
/// @notice Verify user's commitment is part of the merkle tree and optionally disclose data from Aadhaar
/// @param nLevels Maximum number of levels in the merkle tree
/// @param namedobTreeLevels Maximum number of levels in the name-dob SMT tree
/// @param nameyobTreeLevels Maximum number of levels in the name-yob SMT tree
/// @input attestation_id Attestation ID of the credential used to generate the commitment
/// @input secret Secret of the user — used to reconstruct commitment
/// @input qrDataHash Hash of the QR data
/// @input gender Gender of the user
/// @input yob Year of birth
/// @input mob Month of birth
/// @input dob Day of birth
/// @input name[2] Name of the user (packed into 2 field elements)
/// @input aadhaar_last_4digits Last 4 digits of Aadhaar number
/// @input pincode Pincode of user's address
/// @input state State(PackedBytes) of user's address
/// @input ph_no_last_4digits Last 4 digits of phone number
/// @input photoHash Hash of user's photo
/// @input ofac_name_dob_smt_leaf_key Leaf key for name-DOB SMT verification
/// @input ofac_name_dob_smt_root Root of name-DOB SMT
/// @input ofac_name_dob_smt_siblings Siblings for name-DOB SMT proof
/// @input ofac_name_yob_smt_leaf_key Leaf key for name-YOB SMT verification
/// @input ofac_name_yob_smt_root Root of name-YOB SMT
/// @input ofac_name_yob_smt_siblings Siblings for name-YOB SMT proof
/// @input merkle_root Root of the commitment merkle tree
/// @input leaf_depth Actual size of the merkle tree
/// @input path Path of the commitment in the merkle tree
/// @input siblings Siblings of the commitment in the merkle tree
/// @input selector Bitmap indicating which fields to reveal
template VC_AND_DISCLOSE_Aadhaar(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH,nLevels, namedobTreeLevels, nameyobTreeLevels){
    signal input attestation_id;
    signal input secret;
    signal input qrDataHash;
    signal input gender;
    signal input yob[4];
    signal input mob[2];
    signal input dob[2];
    signal input name[nameMaxLength()];
    signal input aadhaar_last_4digits[4];
    signal input pincode[6];
    signal input state[maxFieldByteSize()];
    signal input ph_no_last_4digits[4];
    signal input photoHash;

    signal input minimumAge;
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;

    signal input ofac_name_dob_smt_leaf_key;
    signal input ofac_name_dob_smt_root;
    signal input ofac_name_dob_smt_siblings[namedobTreeLevels];


    signal input ofac_name_yob_smt_leaf_key;
    signal input ofac_name_yob_smt_root;
    signal input ofac_name_yob_smt_siblings[nameyobTreeLevels];

    signal input merkle_root;
    signal input leaf_depth;
    signal input path[nLevels];
    signal input siblings[nLevels];

    signal input selector;
    signal input scope;
    signal input user_identifier;

    signal input forbidden_countries_list[MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3];
    // convert selector to 119 bits which acts as a bitmap for the fields to reveal
    signal sel_bits[119] <== Num2Bits(119)(selector);

    signal output nullifier <== Poseidon(2)([secret, scope]);

    // verify commitment is part of the merkle tree
    signal uppercase_name[nameMaxLength()] <== VERIFY_COMMITMENT(nLevels)(
        attestation_id,
        secret,
        qrDataHash,
        gender,
        yob,
        mob,
        dob,
        name,
        aadhaar_last_4digits,
        pincode,
        state,
        ph_no_last_4digits,
        photoHash,
        merkle_root,
        leaf_depth,
        path,
        siblings
    );

    signal name_packed[2] <== PackBytes(nameMaxLength())(uppercase_name);
    signal yob_integer <== DigitBytesToInt(4)(yob);
    signal mob_integer <== DigitBytesToInt(2)(mob);
    signal dob_integer <== DigitBytesToInt(2)(dob);

    // verify name-DOB in OFAC list
    component ofac_name_dob = OFAC_NAME_DOB_AADHAAR(namedobTreeLevels);
    ofac_name_dob.name <== name_packed;
    ofac_name_dob.YOB <== yob_integer;
    ofac_name_dob.MOB <== mob_integer;
    ofac_name_dob.DOB <== dob_integer;
    ofac_name_dob.smt_leaf_key <== ofac_name_dob_smt_leaf_key;
    ofac_name_dob.smt_root <== ofac_name_dob_smt_root;
    ofac_name_dob.smt_siblings <== ofac_name_dob_smt_siblings;

    // verify name-YOB in OFAC list
    component ofac_name_yob = OFAC_NAME_YOB_AADHAAR(nameyobTreeLevels);
    ofac_name_yob.name <== name_packed;
    ofac_name_yob.YOB <== yob_integer;
    ofac_name_yob.smt_leaf_key <== ofac_name_yob_smt_leaf_key;
    ofac_name_yob.smt_root <== ofac_name_yob_smt_root;
    ofac_name_yob.smt_siblings <== ofac_name_yob_smt_siblings;

    //Range-check for minimumAge
    component range_check_minimumAge = Num2Bits(7);
    range_check_minimumAge.in <== minimumAge;

    // verify age is greater than minimum age
    signal age <== AgeExtractor()(yob, mob, dob, currentYear, currentMonth, currentDay);

    signal isAgeGreaterThanMinimumAge <== GreaterEqThan(7)([age, minimumAge]);

    signal isMinimumAgeValid <== isAgeGreaterThanMinimumAge * minimumAge ;

    // reveal fields based on selector

    signal revealData[119];
    revealData[0] <== gender * sel_bits[0];


    for (var i = 0; i < 4; i++){
        revealData[i + 1] <== yob[i] * sel_bits[i + 1];
    }


    for (var i = 0; i < 2; i++){
        revealData[i + 5] <== mob[i] * sel_bits[i + 5];
    }


    for (var i = 0; i < 2; i++){
        revealData[i + 7] <== dob[i] * sel_bits[i + 7];
    }

    for (var i = 0; i < nameMaxLength(); i++){
        revealData[i + 9] <== name[i] * sel_bits[i + 9];
    }

    for (var i = 0; i < 4; i++){
        revealData[i + 71] <== aadhaar_last_4digits[i] * sel_bits[i + 71];
    }

    for (var i = 0; i < 6; i++){
        revealData[i + 75] <== pincode[i] * sel_bits[i + 75];
    }

    for (var i = 0; i < maxFieldByteSize(); i++){
        revealData[i + 81] <== state[i] * sel_bits[i + 81];
    }

    for (var i = 0; i < 4; i++){
        revealData[i + 112] <== ph_no_last_4digits[i] * sel_bits[i + 112];
    }

    signal output reveal_photoHash <== photoHash * sel_bits[116];

    revealData[116] <== ofac_name_dob.ofacCheckResult * sel_bits[117];
    revealData[117] <== ofac_name_yob.ofacCheckResult * sel_bits[118];
    revealData[118] <== isMinimumAgeValid;

    var revealed_data_packed_chunk_length = computeIntChunkLength(119);
    signal output revealData_packed[revealed_data_packed_chunk_length] <== PackBytes(119)(revealData);

    component country_not_in_list_circuit = CountryNotInList(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH);

    country_not_in_list_circuit.country[0] <== 73;
    country_not_in_list_circuit.country[1] <== 78;
    country_not_in_list_circuit.country[2] <== 68;

    country_not_in_list_circuit.forbidden_countries_list <== forbidden_countries_list;

    var chunkLength = computeIntChunkLength(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH * 3);
    signal output forbidden_countries_list_packed[chunkLength] <== country_not_in_list_circuit.forbidden_countries_list_packed;

    attestation_id === 3;
}

component main { public
    [
        attestation_id,
        currentYear,
        currentMonth,
        currentDay,
        ofac_name_dob_smt_root,
        ofac_name_yob_smt_root,
        merkle_root,
        scope,
        user_identifier
    ]
} = VC_AND_DISCLOSE_Aadhaar(40, 33, 64, 64);
