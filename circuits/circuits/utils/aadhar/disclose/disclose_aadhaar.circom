pragma circom 2.1.9;

include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "circomlib/circuits/poseidon.circom";
include "../extractor.circom";
include "../constants.circom";
include "../../passport/date/isOlderThan.circom";
include "../ofac/ofac_name_dob.circom";
include "../ofac/ofac_name_yob.circom";

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
/// @input selector_ofac bitmap used to reveal the OFAC verification result

/// @output timestamp Timestamp of when the data was signed - extracted and converted to Unix timestamp
/// @output ageAbove18 Boolean flag indicating age is above 18; 0 if not revealed
/// @output gender Gender 70(F) or 77(M); 0 if not revealed
/// @output pinCode Pin code of the address as int; 0 if not revealed
/// @output state State packed as int (reverse order); 0 if not revealed

/// @output ageabove
/// @output pincode
/// @output gender
/// @output state


template DiscloseAadhaar(
    maxDataLength,
    nameMaxBytes,
    namedobTreeLevels,
    nameyobTreeLevels
) {

    // data inputs
    signal input qrDataPadded[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    //age related
    signal input majorityASCII[2];

    //selector bitmaps
    signal input revealAgeolderthan;
    signal input revealGender;
    signal input revealPinCode;
    signal input revealState;
    signal input selector_ofac;
    
    //ofac 
    signal input ofac_namedob_smt_leaf_key;
    signal input ofac_namedob_smt_root;
    signal input ofac_namedob_smt_siblings[namedobTreeLevels];

    signal input ofac_nameyob_smt_leaf_key;
    signal input ofac_nameyob_smt_root;
    signal input ofac_nameyob_smt_siblings[nameyobTreeLevels];

    // Outputs
    signal output timestamp;
    signal output Ageolderthan;
    signal output gender;
    signal output state;
    signal output pinCode;

    // Assert data between qrDataPaddedLength and maxDataLength is zero
    AssertZeroPadding(maxDataLength)(qrDataPadded, qrDataPaddedLength);

    // Reveal extracted data
    revealAgeolderthan * (revealAgeolderthan - 1) === 0;
    revealGender * (revealGender - 1) === 0;
    revealPinCode * (revealPinCode - 1) === 0;
    revealState * (revealState - 1) === 0;
    selector_ofac * (selector_ofac - 1) === 0;

    // extract all the data from QR and computer commitment + nullfier
    component qrDataExtractor = QRDataExtractor(maxDataLength,nameMaxBytes);
    qrDataExtractor.data <== qrDataPadded;
    qrDataExtractor.qrDataPaddedLength <== qrDataPaddedLength;
    qrDataExtractor.delimiterIndices <== delimiterIndices;

    // signal name[packedLength] <== qrDataExtractor.Name;
    signal nameHash <== qrDataExtractor.NameHash;
    signal RefId <== qrDataExtractor.RefID;
    signal age <== qrDataExtractor.age;
    signal photo[photoPackSize()] <== qrDataExtractor.photo;
    signal year <== qrDataExtractor.yearofbirth;
    signal month <== qrDataExtractor.monthofbirth;
    signal day <== qrDataExtractor.dayofbirth;

    //TODO
    //either move age logic to ageextractor or a new tmeplate

    // assert majority is between 0 and 99 (48-57 in ASCII)
    component lessThan[4];
    for (var i = 0; i < 4; i++) {
        lessThan[i] = LessThan(8);
    }
    lessThan[0].in[0] <== 47;
    lessThan[0].in[1] <== majorityASCII[0];
    lessThan[1].in[0] <== 47;
    lessThan[1].in[1] <== majorityASCII[1];
    lessThan[2].in[0] <== majorityASCII[0];
    lessThan[2].in[1] <== 58;
    lessThan[3].in[0] <== majorityASCII[1];
    lessThan[3].in[1] <== 58;

    signal checkLessThan[4];
    checkLessThan[0] <== lessThan[0].out;
    for (var i = 1; i < 4; i++) {
        checkLessThan[i] <== checkLessThan[i-1] * lessThan[i].out;
    }
    checkLessThan[3] === 1;

    signal TEN <== 10;
    signal majorityNum <== ( majorityASCII[0] - 48 ) * TEN + ( majorityASCII[1] - 48 );

    component AgeCheck = GreaterEqThan(8);
    AgeCheck.in[0] <== age;
    AgeCheck.in[1] <== majorityNum;


    pinCode <== revealPinCode * qrDataExtractor.pinCode;
    state <== revealState * qrDataExtractor.state;
    gender <== revealGender * qrDataExtractor.gender;
    timestamp <== qrDataExtractor.timestamp;
    Ageolderthan <==  revealAgeolderthan * AgeCheck.out; // Note: 0 does not necessarily mean age is below 18


    signal ofacCheckResultNameDob <== OFAC_NAME_DOB(namedobTreeLevels)(
        nameHash,
        year,
        month,
        day,
        ofac_namedob_smt_leaf_key,
        ofac_namedob_smt_root,
        ofac_namedob_smt_siblings
    );

    signal ofacCheckResultNameYob <== OFAC_NAME_YOB(nameyobTreeLevels)(
        nameHash,
        year,
        ofac_nameyob_smt_leaf_key,
        ofac_nameyob_smt_root,
        ofac_nameyob_smt_siblings
    );
    
}

