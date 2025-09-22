pragma circom 2.1.9;

include "anon-aadhaar-circuits/src/helpers/constants.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/poseidon.circom";
include "../passport/customHashers.circom";
include "./pack.circom";

/// @notice Position of the phone number in the QR data
function phnoPosition() {
    return 17;
}

/// @notice Maximum length (62) of the name in the QR data
function nameMaxLength() {
    return 2 * maxFieldByteSize();
}

/// @title DOBExtractor
/// @notice Extract date of birth from the Aadhaar QR data
/// @param maxDataLength - Maximum length of the data
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the date of birth start
/// @output year - year of birth in ascii format
/// @output month - month of birth in ascii format
/// @output day - day of birth in ascii format
template DOBExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;

    signal output nDelimitedDataShiftedToDob[maxDataLength];

    // Shift the data to the right to until the DOB index
    // We are not using SubArraySelector as the shifted data is an output
    component shifter = VarShiftLeft(maxDataLength, maxDataLength);
    shifter.in <== nDelimitedData;
    shifter.shift <== startDelimiterIndex; // We want delimiter to be the first byte

    signal shiftedBytes[maxDataLength] <== shifter.out;

    // Assert delimiters around the data is correct
    shiftedBytes[0] === dobPosition() * 255;
    shiftedBytes[11] === (dobPosition() + 1) * 255;

    // Convert DOB bytes to unix timestamp.
    // Get year, month, day as int (DD-MM-YYYY format)
    signal output year[4] <== [shiftedBytes[7], shiftedBytes[8], shiftedBytes[9], shiftedBytes[10]];
    signal output month[2] <== [shiftedBytes[4], shiftedBytes[5]];
    signal output day[2] <== [shiftedBytes[1], shiftedBytes[2]];

    nDelimitedDataShiftedToDob <== shiftedBytes;
}


template AgeExtractor() {
    signal input DOB_year[4];
    signal input DOB_month[2];
    signal input DOB_day[2];

    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;

     // Convert DOB bytes to unix timestamp.
    signal year <== DigitBytesToInt(4)([DOB_year[0], DOB_year[1], DOB_year[2], DOB_year[3]]);
    signal month <== DigitBytesToInt(2)([DOB_month[0], DOB_month[1]]);
    signal day <== DigitBytesToInt(2)([DOB_day[0], DOB_day[1]]);

    // Completed age based on year value
    signal ageByYear <== currentYear - year - 1;

    // +1 to age if month is above currentMonth, or if months are same and day is higher
    signal monthGt <== GreaterThan(4)([currentMonth, month]);

    signal monthEq <== IsEqual()([currentMonth, month]);

    signal dayGt <== GreaterThan(5)([currentDay + 1, day]);

    signal isHigherDayOnSameMonth <== monthEq * dayGt;

    signal output age <== ageByYear + (monthGt + isHigherDayOnSameMonth);
}

/// @title TimestampExtractor
/// @notice Extracts the timestamp when the QR was signed rounded to nearest hour
/// @dev We ignore seconds to avoid identifying the user based on the precise timestamp
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @output timestamp - Unix timestamp on signature
/// @output year - Year of the signature
/// @output month - Month of the signature
/// @output day - Day of the signature
template TimestampExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];

    signal output timestamp;
    signal output year <== DigitBytesToInt(4)([nDelimitedData[9], nDelimitedData[10], nDelimitedData[11], nDelimitedData[12]]);
    signal output month <== DigitBytesToInt(2)([nDelimitedData[13], nDelimitedData[14]]);
    signal output day <== DigitBytesToInt(2)([nDelimitedData[15], nDelimitedData[16]]);
    signal hour <== DigitBytesToInt(2)([nDelimitedData[17], nDelimitedData[18]]);
    signal minute <== DigitBytesToInt(2)([nDelimitedData[19], nDelimitedData[20]]);

    component dateToUnixTime = DigitBytesToTimestamp(2032);
    dateToUnixTime.year <== year;
    dateToUnixTime.month <== month;
    dateToUnixTime.day <== day;
    dateToUnixTime.hour <== hour;
    dateToUnixTime.minute <== minute;
    dateToUnixTime.second <== 0;

    timestamp <== dateToUnixTime.out - 19800; // 19800 is the offset for IST
}

/// @title NameExtractor
/// @notice Extracts Name
/// @notice This assumes max name length  62 bytes
/// @param maxDataLength - Maximum length of the data
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input delimiterIndices - indices of the delimiters in the QR data
/// @output out - name in ascii format
template NameExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input delimiterIndices[18];

    signal startDelimiterIndex <== delimiterIndices[namePosition() - 1];
    signal endDelimiterIndex <== delimiterIndices[namePosition()];

    var nameMaxLength = 2 * maxFieldByteSize();
    var byteLength = nameMaxLength + 1;

    signal output out[nameMaxLength];

    // Shift the data to the right till the the delimiter start
    component subArraySelector = SelectSubArray(maxDataLength, byteLength);
    subArraySelector.in <== nDelimitedData;
    subArraySelector.startIndex <== startDelimiterIndex; // We want delimiter to be the first byte
    subArraySelector.length <== endDelimiterIndex - startDelimiterIndex;
    signal shiftedBytes[byteLength] <== subArraySelector.out;

    // Assert that the first byte is the delimiter (255 * namePosition())
    shiftedBytes[0] === namePosition() * 255;

    // Assert that last byte is the delimiter (255 * (namePosition() + 1))
    component endDelimiterSelector = ItemAtIndex(maxDataLength);
    endDelimiterSelector.in <== nDelimitedData;
    endDelimiterSelector.index <== endDelimiterIndex;
    endDelimiterSelector.out === (namePosition() + 1) * 255;

    for (var i = 0; i < nameMaxLength; i ++) {
        out[i] <== shiftedBytes[i + 1]; // +1 to skip the delimiter
    }

}


/// @title GenderExtractor
/// @notice Extracts the Gender from the Aadhaar QR data
/// @input nDelimitedDataShiftedToDob[maxDataLength] - QR data where each delimiter is 255 * n
///     where n is order of the data shifted till DOB index
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

/// @title PinCodeExtractor
/// @notice Extracts the pin code from the Aadhaar QR data
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the pin code start
/// @input endDelimiterIndex - index of the delimiter up to which the pin code is present
/// @output out - pinCode in ascii format
template PinCodeExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input endDelimiterIndex;

    signal output out[6];

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

    out <== [shiftedBytes[1], shiftedBytes[2], shiftedBytes[3], shiftedBytes[4], shiftedBytes[5], shiftedBytes[6]];
}



/// @title PhnoLast4DigitCodeExtractor
/// @notice Extracts the last 4 digits of the phone number from the Aadhaar QR data
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the phone number start
/// @input endDelimiterIndex - index of the delimiter up to which the phone number is present
/// @output out - last 4 digits of the phone number in ascii format
template PhnoLast4DigitCodeExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input endDelimiterIndex;

    signal output out[4];

    var phnoMaxLength = 10;
    var byteLength = phnoMaxLength + 2; // 2 delimiters

    signal length <== endDelimiterIndex - startDelimiterIndex + 1;

    component subArraySelector = SelectSubArray(maxDataLength, byteLength);
    subArraySelector.in <== nDelimitedData;
    subArraySelector.startIndex <== startDelimiterIndex;
    subArraySelector.length <== length;

    signal shiftedBytes[byteLength] <== subArraySelector.out;

    component isLessThan7 = LessThan(4);
    isLessThan7.in[0] <== length;
    isLessThan7.in[1] <== 7;

     shiftedBytes[0] ===  phnoPosition() * 255;
     // Assert delimiters around the data is correct for phno length 4
    isLessThan7.out * shiftedBytes[5] === isLessThan7.out * (phnoPosition() + 1) * 255;

    signal isNotLessThan7 <== 1 - isLessThan7.out;

    // Assert delimiters around the data is correct for phno length 10
    isNotLessThan7 * shiftedBytes[11] === isNotLessThan7 * (phnoPosition() + 1) * 255;

    signal out4[4] <== [shiftedBytes[1], shiftedBytes[2], shiftedBytes[3], shiftedBytes[4]];
    signal out10[4] <== [shiftedBytes[7], shiftedBytes[8], shiftedBytes[9], shiftedBytes[10]];

    for (var i = 0; i < 4; i ++) {
        out[i] <== isLessThan7.out * out4[i] + out10[i];
    }

}

/// @title ExtractData
/// @notice Helper function to extract data at a position
/// @dev This is only used for state now;
/// @param maxDataLength - Maximum length of the data
/// @param extractPosition - Position of the data to extract (after which delimiter does the data start)
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input delimiterIndices - indices of the delimiters in the QR data
/// @output out - data in ascii format
template ExtractData(maxDataLength, extractPosition) {
    signal input nDelimitedData[maxDataLength];
    signal input delimiterIndices[18];

    signal startDelimiterIndex <== delimiterIndices[extractPosition - 1];
    signal endDelimiterIndex <== delimiterIndices[extractPosition];

    var extractMaxLength = maxFieldByteSize();
    var byteLength = extractMaxLength + 1;

    signal output out[extractMaxLength];

    // Shift the data to the right till the the delimiter start
    component subArraySelector = SelectSubArray(maxDataLength, byteLength);
    subArraySelector.in <== nDelimitedData;
    subArraySelector.startIndex <== startDelimiterIndex; // We want delimiter to be the first byte
    subArraySelector.length <== endDelimiterIndex - startDelimiterIndex;
    signal shiftedBytes[byteLength] <== subArraySelector.out;

    // Assert that the first byte is the delimiter (255 * position of the field)
    shiftedBytes[0] === extractPosition * 255;

    // Assert that last byte is the delimiter (255 * (position of the field + 1))
    component endDelimiterSelector = ItemAtIndex(maxDataLength);
    endDelimiterSelector.in <== nDelimitedData;
    endDelimiterSelector.index <== endDelimiterIndex;
    endDelimiterSelector.out === (extractPosition + 1) * 255;

    for (var i = 0; i < extractMaxLength; i ++) {
        out[i] <== shiftedBytes[i + 1]; // +1 to skip the delimiter
    }

}


/// @title PhotoExtractor
/// @notice Extracts the photo from the Aadhaar QR data
/// @dev Not reusing ExtractAndPackAsInt as there is no endDelimiter (photo is last item)
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the photo start
/// @input endIndex - index of the last byte of the photo
/// @output out - Hash of the photo
template PhotoExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input endIndex;

    signal output out;

    var photoMaxLength = photoPackSize() * maxFieldByteSize();
    var bytesLength = photoMaxLength + 1;

    // Shift the data to the right to until the photo index
    component subArraySelector = SelectSubArray(maxDataLength, bytesLength);
    subArraySelector.in <== nDelimitedData;
    subArraySelector.startIndex <== startDelimiterIndex; // We want delimiter to be the first byte
    subArraySelector.length <== endIndex - startDelimiterIndex + 1;

    signal shiftedBytes[bytesLength] <== subArraySelector.out;

    // Assert that the first byte is the delimiter (255 * position of name field)
    shiftedBytes[0] === photoPosition() * 255;

    // Assert that last byte is the EOI (217)
    component EOIDelimiterSelector = ItemAtIndex(maxDataLength);
    EOIDelimiterSelector.in <== nDelimitedData;
    EOIDelimiterSelector.index <== endIndex;
    EOIDelimiterSelector.out === 217;

    // Assert that last second byte is the (255)
    component DelimiterSelector = ItemAtIndex(maxDataLength);
    DelimiterSelector.in <== nDelimitedData;
    DelimiterSelector.index <== endIndex - 1;
    DelimiterSelector.out === 255;

    // Pack byte[] to int[] where int is field element which take up to 31 bytes
    // When packing like this the trailing 0s in each chunk would be removed as they are LSB
    // This is ok for being used in nullifiers as the behaviour would be consistent
    component outInt = PackBytesAndPoseidon(photoMaxLength);
    for (var i = 0; i < photoMaxLength; i ++) {
        outInt.in[i] <== shiftedBytes[i + 1]; // +1 to skip the delimiter
    }

    out <== outInt.out;
}

/// @title ValidateDelimiterIndices
/// @notice Validates the delimiter indices
/// @input delimiterIndices[18] - Delimiter indices
template ValidateDelimiterIndices() {
    signal input delimiterIndices[18];
    signal input photoEOI;

    component range_check[19];
    component delimiter_idx_less_than_nxt_idx[17];

    for(var i = 0; i < 17; i++) {
        range_check[i] = Num2Bits(12);
        range_check[i].in <== delimiterIndices[i];

        delimiter_idx_less_than_nxt_idx[i] = LessThan(12);
        delimiter_idx_less_than_nxt_idx[i].in[0] <== delimiterIndices[i];
        delimiter_idx_less_than_nxt_idx[i].in[1] <== delimiterIndices[i + 1];
        delimiter_idx_less_than_nxt_idx[i].out === 1;
    }

    range_check[17] = Num2Bits(12);
    range_check[17].in <== delimiterIndices[17];

    range_check[18] = Num2Bits(12);
    range_check[18].in <== photoEOI;

    component is_last_delimiter_idx_valid = LessThan(12);
    is_last_delimiter_idx_valid.in[0] <== delimiterIndices[17];
    is_last_delimiter_idx_valid.in[1] <== photoEOI;
    is_last_delimiter_idx_valid.out === 1;


}


//TODO: Currently we use state to be 31 bytes , but this can be reduced to MAX LENGTH OF STATE

/// @title EXTRACT_QR_DATA
/// @notice Extracts the data from the Aadhaar QR data
/// @input data[maxDataLength] - QR data without the signature padded
/// @input qrDataPaddedLength - length of the QR data
/// @input delimiterIndices - indices of the delimiters in the QR data
/// @output name[2] - name of the user
/// @output yob - year of birth
/// @output mob - month of birth
/// @output dob - day of birth
/// @output gender - gender of the user
/// @output pincode - pincode of the user
/// @output state - state of the user
/// @output aadhaar_last_4digits - last 4 digits of the Aadhaar number
/// @output ph_no_last_4digits - last 4 digits of the phone number
template EXTRACT_QR_DATA(maxDataLength) {
    signal input data[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    signal input photoEOI;


    // Outputs are in ascii format
    signal output name[nameMaxLength()];
    signal output yob[4];
    signal output mob[2];
    signal output dob[2];
    signal output gender;
    signal output pincode[6];
    signal output state[maxFieldByteSize()];
    signal output aadhaar_last_4digits[4];
    signal output ph_no_last_4digits[4];
    signal output photoHash;
    signal output timestamp;

    // Create `nDelimitedData` - same as `data` but each delimiter is replaced with n * 255
    // where n means the nth occurrence of 255
    // This is to verify `delimiterIndices` is correctly set for each extraction
    component is255[maxDataLength];
    component indexBeforePhoto[maxDataLength];
    signal is255AndIndexBeforePhoto[maxDataLength];
    signal nDelimitedData[maxDataLength];
    signal n255Filter[maxDataLength + 1];
    n255Filter[0] <== 0;

    component validateDelimiterIndices = ValidateDelimiterIndices();
    validateDelimiterIndices.delimiterIndices <== delimiterIndices;
    validateDelimiterIndices.photoEOI <== photoEOI;

    component photoEOI_valid = LessThan(12);
    photoEOI_valid.in[0] <== photoEOI;
    photoEOI_valid.in[1] <== qrDataPaddedLength;
    photoEOI_valid.out === 1;



    for (var i = 0; i < maxDataLength; i++) {
        is255[i] = IsEqual();
        is255[i].in[0] <== 255;
        is255[i].in[1] <== data[i];

        indexBeforePhoto[i] = LessThan(12);
        indexBeforePhoto[i].in[0] <== i;
        indexBeforePhoto[i].in[1] <== delimiterIndices[photoPosition() - 1] + 1;

        is255AndIndexBeforePhoto[i] <== is255[i].out * indexBeforePhoto[i].out;

        // Each value is n * 255 where n the count of 255s before it
        n255Filter[i + 1] <== is255AndIndexBeforePhoto[i] * 255 + n255Filter[i];

        nDelimitedData[i] <== is255AndIndexBeforePhoto[i] * n255Filter[i] + data[i];
    }

    //Extract name and hash
    component nameExtractor = NameExtractor(maxDataLength);
    nameExtractor.nDelimitedData <== nDelimitedData;
    nameExtractor.delimiterIndices <== delimiterIndices;
    name <== nameExtractor.out;


    //Extract last 4 digit of Aadhar no
    aadhaar_last_4digits <== [nDelimitedData[5],nDelimitedData[6],nDelimitedData[7],nDelimitedData[8]];

    // Extract date of birth
    component dobExtractor = DOBExtractor(maxDataLength);
    dobExtractor.nDelimitedData <== nDelimitedData;
    dobExtractor.startDelimiterIndex <== delimiterIndices[dobPosition() - 1];

    yob <== dobExtractor.year;
    mob <== dobExtractor.month;
    dob <== dobExtractor.day;

    // Extract gender
    // dobExtractor returns data shifted till DOB. Since size for DOB data is fixed,
    // we can use the same shifted data to extract gender.
    component genderExtractor = GenderExtractor(maxDataLength);
    genderExtractor.nDelimitedDataShiftedToDob <== dobExtractor.nDelimitedDataShiftedToDob;
    gender <== genderExtractor.out;

    // Extract pin code
    component pinCodeExtractor = PinCodeExtractor(maxDataLength);
    pinCodeExtractor.nDelimitedData <== nDelimitedData;
    pinCodeExtractor.startDelimiterIndex <== delimiterIndices[pinCodePosition() - 1];
    pinCodeExtractor.endDelimiterIndex <== delimiterIndices[pinCodePosition()];
    pincode <== pinCodeExtractor.out;

    // Extract last 4 digits of phone number
    component phnoLast4DigitCodeExtractor = PhnoLast4DigitCodeExtractor(maxDataLength);
    phnoLast4DigitCodeExtractor.nDelimitedData <== nDelimitedData;
    phnoLast4DigitCodeExtractor.startDelimiterIndex <== delimiterIndices[phnoPosition() - 1];
    phnoLast4DigitCodeExtractor.endDelimiterIndex <== delimiterIndices[phnoPosition()];
    ph_no_last_4digits <== phnoLast4DigitCodeExtractor.out;

    // Extract state
    component stateExtractor = ExtractData(maxDataLength, statePosition());
    stateExtractor.nDelimitedData <== nDelimitedData;
    stateExtractor.delimiterIndices <== delimiterIndices;
    state <== stateExtractor.out;

    // Extract photo
    component photoExtractor = PhotoExtractor(maxDataLength);
    photoExtractor.nDelimitedData <== nDelimitedData;
    photoExtractor.startDelimiterIndex <== delimiterIndices[photoPosition() - 1];
    photoExtractor.endIndex <== photoEOI;
    photoHash <== photoExtractor.out;

    // Extract timestamp
    component timestampExtractor = TimestampExtractor(maxDataLength);
    timestampExtractor.nDelimitedData <== nDelimitedData;
    timestamp <== timestampExtractor.timestamp;

}
