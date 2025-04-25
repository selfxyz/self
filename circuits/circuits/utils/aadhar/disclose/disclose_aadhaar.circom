pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "circomlib/circuits/poseidon.circom";
include "../extractor.circom";
include "../constants.circom";
include "../../passport/date/isOlderThan.circom";

/// @notice  Aadhaar Disclosure circuit — used after user registration
/// @input qrDataPadded QR data without the signature; assumes elements to be bytes; remaining space is padded with 0
/// @input qrDataPaddedLength Length of padded QR data
/// @input delimiterIndexes
/// @input scope Scope of the application users generates the proof for
/// we chekc if age is greater than or equal
/// @input majority Majority user wants to prove he is older than: YY — ASCII
/// @input current_date Current date: YYMMDD — number

/// @input revealAgeolderthan Flag to reveal age older than
/// @input revealGender Flag to reveal extracted gender
/// @input revealPinCode Flag to reveal extracted pin code
/// @input revealState Flag to reveal extracted state

/// @output pubkeyHash Poseidon hash of the RSA public key (after merging nearby chunks)
/// @output timestamp Timestamp of when the data was signed - extracted and converted to Unix timestamp
/// @output ageAbove18 Boolean flag indicating age is above 18; 0 if not revealed
/// @output gender Gender 70(F) or 77(M); 0 if not revealed
/// @output pinCode Pin code of the address as int; 0 if not revealed
/// @output state State packed as int (reverse order); 0 if not revealed

/// @output ageabove
/// @output pincode
/// @output gender
/// @output state


template DISCLOSE(
    MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH,
    passportNoTreeLevels,
    namedobTreeLevels,
    nameyobTreeLevels
) {

    signal input secret;
    signal input attestation_id;// == 2,
    // data inputs
    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    //age related
    signal input majority[2];
    //selector bitmaps
    signal input revealAgeolderthan;
    signal input revealGender;
    signal input revealPinCode;
    signal input revealState;
    // Outputs
    signal output timestamp;
    signal output Ageolderthan;
    signal output gender;
    signal output state;
    signal output pinCode;

    // Assert data between qrDataPaddedLength and maxDataLength is zero
    AssertZeroPadding(maxDataLength)(qrDataPadded, qrDataPaddedLength);

    // extract all the data from QR and computer commitment + nullfier
    component qrDataExtractor = QRDataExtractor(maxDataLength);
    qrDataExtractor.data <== qrDataPadded;
    qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    qrDataExtractor.delimiterIndices <== delimiterIndices;

    signal name[packedLength] <== qrDataExtractor.Name;
    signal nameHash <== qrDataExtractor.NameHash;
    signal RefId <== qrDataExtractor.RefID;
    signal timestamp <== qrDataExtractor.timestamp;
    signal age <== qrDataExtractor.age;
    signal DOBHash <== qrDataExtractor.DOBHash;
    signal gender <== qrDataExtractor.gender;
    signal state <== qrDataExtractor.state;
    signal pinCode <== qrDataExtractor.pinCode;
    signal photo[photoPackSize()] <== qrDataExtractor.photo;


    //TODO
    //either move age logic to  ageextractor or a new tmeplate
    //add checks for majority in []
        // assert majority is between 0 and 99 (48-57 in ASCII)
    // component lessThan[4];
    // for (var i = 0; i < 4; i++) {
    //     lessThan[i] = LessThan(8);
    // }
    // lessThan[0].in[0] <== 47;
    // lessThan[0].in[1] <== majorityASCII[0];
    // lessThan[1].in[0] <== 47;
    // lessThan[1].in[1] <== majorityASCII[1];
    // lessThan[2].in[0] <== majorityASCII[0];
    // lessThan[2].in[1] <== 58;
    // lessThan[3].in[0] <== majorityASCII[1];
    // lessThan[3].in[1] <== 58;

    // signal checkLessThan[4];
    // checkLessThan[0] <== lessThan[0].out;
    // for (var i = 1; i < 4; i++) {
    //     checkLessThan[i] <== checkLessThan[i-1] * lessThan[i].out;
    // }
    // checkLessThan[3] === 1;

    majorityNum <== ( majorityASCII[0] - 48 ) * TEN + ( majorityASCII[1] - 48 );
    component AgeCheck = GreaterEqThan(8);
    AgeCheck.in[0] <== age;
    AgeCheck.in[1] <== GreaterEqThan;

    Ageolderthan <== AgeCheck.out;

    // signal ofacCheckResultPassportNo <== OFAC_PASSPORT_NUMBER(passportNoTreeLevels)(
    //     dg1,
    //     ofac_passportno_smt_leaf_key,
    //     ofac_passportno_smt_root,
    //     ofac_passportno_smt_siblings
    // );

    // signal ofacCheckResultNameDob <== OFAC_NAME_DOB(namedobTreeLevels)(
    //     dg1,
    //     ofac_namedob_smt_leaf_key,
    //     ofac_namedob_smt_root,
    //     ofac_namedob_smt_siblings
    // );

    // signal ofacCheckResultNameYob <== OFAC_NAME_YOB(nameyobTreeLevels)(
    //     dg1,
    //     ofac_nameyob_smt_leaf_key,
    //     ofac_nameyob_smt_root,
    //     ofac_nameyob_smt_siblings
    // );
    

    signal output revealedData_packed[3] <== PackBytes(93)(revealedData);
}

