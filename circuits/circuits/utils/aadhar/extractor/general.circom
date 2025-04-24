pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email/circuits/utils/array.circom";
include "@openpassport/zk-email/circuits/utils/bytes.circom";

/// @title RefIdExtractor
/// @notice Extracts the 4 digits of the aadhar number
/// @input nDelimitedData[maxDataLength]
/// @output RedId the 4 digit refid
template RefIdExtractor(maxDataLength){
    signal input nDelimitedData[maxDataLength];
    signal output RefId;
    RedId <== DigitBytesToInt([nDelimitedData[5],nDelimitedData[6],nDelimitedData[7],nDelimitedData[8]]);
}


/// @title GenderExtractor
/// @notice Extracts the Gender from the Aadhaar QR data and returns as Unix timestamp
/// @input nDelimitedDataShiftedToDob[maxDataLength] - QR data where each delimiter is 255 * n 
///        where n is order of the data shifted till DOB index
/// @input startDelimiterIndex - index of the delimiter after
/// @output out Single byte number representing gender
template GenderExtractor(maxDataLength) {
    signal input nDelimitedDataShiftedToDob[maxDataLength];
    signal output out;

    // Gender is always 1 byte and is immediate after DOB
    // We use nDelimitedDataShiftedToDob and start after 10 + 1 bytes of DOB data
    // This is more efficient than using ItemAtIndex thrice (for startIndex, gender, endIndex)
    // saves around 14k constraints
    nDelimitedDataShiftedToDob[11] === genderPosition() * 255;
    nDelimitedDataShiftedToDob[13] === (genderPosition() + 1) * 255;

    out <== nDelimitedDataShiftedToDob[12];
}

/// @title  PinCodeExtractor
/// @notice Extracts the pin code from the Aadhaar QR data
/// @input  nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input  startDelimiterIndex - index of the delimiter after which the pin code start
/// @input  endDelimiterIndex - index of the delimiter up to which the pin code is present
/// @output out - pinCode as integer
template PinCodeExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input endDelimiterIndex;

    signal output out;

    var pinCodeMaxLength = 6;
    var byteLength = pinCodeMaxLength + 2; // 2 delimiters

    component subArraySelector = SelectSubArray(maxDataLength, byteLength);
    subArraySelector.in <== nDelimitedData;
    subArraySelector.startIndex <== startDelimiterIndex;
    subArraySelector.length <== endDelimiterIndex - startDelimiterIndex + 1;

    signal shiftedBytes[byteLength] <== subArraySelector.out;

    // Assert delimiters around the data is correct
    shiftedBytes[0] === pinCodePosition() * 255;
    shiftedBytes[7] === (pinCodePosition() + 1) * 255;

    out <== DigitBytesToInt(6)([shiftedBytes[1], shiftedBytes[2], shiftedBytes[3], shiftedBytes[4], shiftedBytes[5], shiftedBytes[6]]);
}

