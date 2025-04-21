pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email/circuits/utils/array.circom";
include "@openpassport/zk-email/circuits/utils/bytes.circom";
include "./constants.circom";
include "./BytesToTimestamp.circom";



/**
Aadhaar QR code data schema (V2)

V1 Docs - https://uidai.gov.in/images/resource/User_manulal_QR_Code_15032019.pdf
There are no official spec docs for Aadhaar V2 available publicly, but the difference from V1 is:
  - "V2" is added at the beginning of the data, before the first delimiter.
  - Phone and email hash is no longer present.
  - Last 4 digits of mobile number is added (before the photo).

- Delimiter is 255.
- Before first delimiter, there are two bytes representing the version. This should be [86, 50] (V2)
- From then on, each field is separated by the delimiter. There are total of 16 fields.
  1 (data after first 255). Email_mobile_present_bit_indicator_value (can be 0 or 1 or 2 or 3): 
      0: indicates no mobile/email present in secure qr code. 
      1: indicates only email present in secure qr code. 
      2: indicates only mobile present in secure qr code 
      3: indicates both mobile and email present in secure qr code.
  2. Reference ID (Last 4 digits of Aadhaar number and timestamp)
  3. Name
  4. Date of Birth
  5. Gender
  6. Address > Care of
  7. Address > District
  8. Address > Landmark
  9. Address > House
  10. Address > Location
  11. Address > Pin code
  12. Address > Post office
  13. Address > State
  14. Address > Street
  15. Address > Sub district
  16. VTC
  17. Last 4 digits of the mobile number
  18. The data after 18th 255 till the end (excluding the 256 for the signature) is the photo.

- Last 256 bytes is the signature.
**/



/// @title ExtractAndPackAsInt
/// @notice Helper function to extract data at a position to a single int (assumes data is less than 31 bytes)
/// @dev This is only used for state now; but can work for district, name, etc if needed
/// @param maxDataLength - Maximum length of the data
/// @param extractPosition - Position of the data to extract (after which delimiter does the data start)
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input delimiterIndices - indices of the delimiters in the QR data
/// @output out - single field (int) element representing the data in big endian order (reverse string when decoded)
template ExtractAndPackAsInt(maxDataLength, extractPosition) {
    signal input nDelimitedData[maxDataLength];
    signal input delimiterIndices[18];

    signal output out;
    
    signal startDelimiterIndex <== delimiterIndices[extractPosition - 1];
    signal endDelimiterIndex <== delimiterIndices[extractPosition];

    var extractMaxLength = maxFieldByteSize(); // Packing data only as a single int
    var byteLength = extractMaxLength + 1; 
    
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

    // Pack byte[] to int[] where int is field element which take up to 31 bytes
    component outInt = PackBytes(extractMaxLength);
    for (var i = 0; i < extractMaxLength; i ++) {
        outInt.in[i] <== shiftedBytes[i + 1]; // +1 to skip the delimiter
    }

    out <== outInt.out[0];
}

/// @title RefIdExtractor
/// @notice Extracts the 4 digits of the aadhar number
/// @input nDelimitedData[maxDataLength]
/// @output RedId the 4 digit refid
template RefIdExtractor(maxDataLength){
    signal input nDelimitedData[maxDataLength];
    signal output RefId;
    RedId <== DigitBytesToInt([nDelimitedData[5],nDelimitedData[6],nDelimitedData[7],nDelimitedData[8]]);
}

/// @title TimestampExtractor
/// @notice Extracts the timestamp when the QR was signed rounded to nearest hour
/// @dev We ignore minutes and seconds to avoid identifying the user based on the precise timestamp
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

    component dateToUnixTime = DigitBytesToTimestamp(2032);
    dateToUnixTime.year <== year;
    dateToUnixTime.month <== month;
    dateToUnixTime.day <== day;
    dateToUnixTime.hour <== hour;
    dateToUnixTime.minute <== 0;
    dateToUnixTime.second <== 0;

    timestamp <== dateToUnixTime.out - 19800; // 19800 is the offset for IST
}


/// @title AgeExtractor 
/// @notice Extract date of birth from the Aadhaar QR data and returns as Unix timestamp
/// @notice The timestamp will correspond to 00:00 of the date in IST timezone
/// @notice Assumes current time input is above DOB
/// @param maxDataLength - Maximum length of the data
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the date of birth start
/// @input currentYear - Current year to calculate the age
/// @input currentMonth - Current month to calculate the age
/// @input currentDay - Current day to calculate the age
/// @output age - Age of the person 
/// @output out - Unix timestamp representing the date of birth
template AgeExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;

    signal output age;
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
    // Get year, month, name as int (DD-MM-YYYY format and starts from shiftedBytes[0])
    signal year <== DigitBytesToInt(4)([shiftedBytes[7], shiftedBytes[8], shiftedBytes[9], shiftedBytes[10]]);
    signal month <== DigitBytesToInt(2)([shiftedBytes[4], shiftedBytes[5]]);
    signal day <== DigitBytesToInt(2)([shiftedBytes[1], shiftedBytes[2]]);

    // Completed age based on year value
    signal ageByYear <== currentYear - year - 1;

    // +1 to age if month is above currentMonth, or if months are same and day is higher
    signal monthGt <== GreaterThan(4)([currentMonth, month]);

    signal monthEq <== IsEqual()([currentMonth, month]);

    signal dayGt <== GreaterThan(5)([currentDay + 1, day]);

    signal isHigherDayOnSameMonth <== monthEq * dayGt;

    age <== ageByYear + (monthGt + isHigherDayOnSameMonth);

    nDelimitedDataShiftedToDob <== shiftedBytes;
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

/// @title PinCodeExtractor
/// @notice Extracts the pin code from the Aadhaar QR data
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the pin code start
/// @input endDelimiterIndex - index of the delimiter up to which the pin code is present
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


/// @title PhotoExtractor
/// @notice Extracts the photo from the Aadhaar QR data
/// @dev Not reusing ExtractAndPackAsInt as there is no endDelimiter (photo is last item)
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the photo start
/// @input endIndex - index of the last byte of the photo
/// @output out - int[33] representing the photo in big endian order
template PhotoExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input endIndex;

    signal output out[photoPackSize()];
    
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

    // Pack byte[] to int[] where int is field element which take up to 31 bytes
    // When packing like this the trailing 0s in each chunk would be removed as they are LSB
    // This is ok for being used in nullifiers as the behaviour would be consistent
    component outInt = PackBytes(photoMaxLength);
    for (var i = 0; i < photoMaxLength; i ++) {
        outInt.in[i] <== shiftedBytes[i + 1]; // +1 to skip the delimiter
    }

    out <== outInt.out;
}

/// @title  NameExtractor
/// @notice Extracts the name and packages it into a hash to be used later
/// @param  maxDataLength   – total length of qrDataPadded
/// @param  nameMaxBytes    – upper bound for the number of bytes in the name
/// @input  nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input  startDelimiterIndex - index of the delimiter after which the name start
/// @input  endIndex - Index of the last byte that belongs to the name field
/// @output namepacked - name packed into field elements
/// @output namehash - poseidon hash namepacked

template NameExtractor(maxDataLength,nameMaxBytes){

    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input endIndex;

    var packedLength  = computeIntChunkLength(nameMaxBytes); // limbs count
    var bytesLength   = nameMaxBytes + 1;                    // +1 for delimiter

    signal output namepacked[packedLength];
    signal output namehash;

    signal shiftedBytes[bytesLength];
    signal out[packedLength];

    component selector = SelectSubArray(maxDataLength, bytesLength);
    selector.in         <== nDelimitedData;
    selector.startIndex <== startDelimiterIndex;
    selector.length     <== (endIndex - startDelimiterIndex + 1);

    for (var i = 0; i < bytesLength; i++)
        shiftedBytes[i] <== selector.out[i];


    // leading delimiter (position index · 255) must match first byte
    shiftedBytes[0] === namePosition() * 255;


    component packer = PackBytes(nameMaxBytes);
    for (var i = 0; i < nameMaxBytes; i++) {
        packer.in[i] <== shiftedBytes[i + 1];       // drop the delimiter
    }

    for (var i = 0; i < packedLength; i++)
        namepacked[i] <== packer.out[i];
    
    namehash <== PackBytesAndPoseidon(packedLength)(namepacked);

}



/// @title QRDataExtractor
/// @notice Extracts the name, date, gender, photo from the Aadhaar QR data
/// @input data[maxDataLength] - QR data without the signature padded
/// @input qrDataPaddedLength - Length of the padded QR data
/// @input delimiterIndices[17] - Indices of the delimiters in the QR data
/// @output name - single field (int) element representing the name in big endian order
/// @output ReFId - 
/// @output age - Unix timestamp representing the date of birth
/// @output gender - Single byte number representing gender
/// @output photo - Photo of the user along the SHA padding
template QRDataExtractor(maxDataLength) {
    signal input data[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];

    // signal output name;
    signal output RefId;
    signal output timestamp;
    signal output ageAbove18;
    signal output gender;
    signal output state;
    signal output pinCode;
    signal output photo[photoPackSize()];

    // Create `nDelimitedData` - same as `data` but each delimiter is replaced with n * 255
    // where n means the nth occurrence of 255
    // This is to verify `delimiterIndices` is correctly set for each extraction
    component is255[maxDataLength];
    component indexBeforePhoto[maxDataLength];
    signal is255AndIndexBeforePhoto[maxDataLength];
    signal nDelimitedData[maxDataLength];
    signal n255Filter[maxDataLength + 1];
    n255Filter[0] <== 0;

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
    // Extract RefID
    component refIdExt = RefIdExtractor( maxQrDataLength );
    refIdExt.nDelimitedData   <== qrDataPadded;
    refIdExt.delimiterIndices <== delimiterIndices;
    RefId <== refIdExt.refId;

    // Extract timestamp
    component timestampExtractor = TimestampExtractor(maxDataLength);
    timestampExtractor.nDelimitedData <== nDelimitedData;
    timestamp <== timestampExtractor.timestamp;
   
    // Extract age - and calculate if above 18
    // We use the year, month, day from the timestamp as the current time to calculate the age
    // This wont be precise but avoid the need for additional `currentTime` input
    // User can generate fresh QR for accuracy if needed (on their 18th birthday)
    component ageExtractor = AgeExtractor(maxDataLength);
    ageExtractor.nDelimitedData <== nDelimitedData;
    ageExtractor.startDelimiterIndex <== delimiterIndices[dobPosition() - 1];
    ageExtractor.currentYear <== timestampExtractor.year;
    ageExtractor.currentMonth <== timestampExtractor.month;
    ageExtractor.currentDay <== timestampExtractor.day;
    
    component ageAbove18Checker = GreaterThan(8);
    ageAbove18Checker.in[0] <== ageExtractor.age;
    ageAbove18Checker.in[1] <== 18;
    ageAbove18 <== ageAbove18Checker.out;

    // Extract gender
    // Age extractor returns data shifted till DOB. Since size for DOB data is fixed,
    // we can use the same shifted data to extract gender.
    component genderExtractor = GenderExtractor(maxDataLength);
    genderExtractor.nDelimitedDataShiftedToDob <== ageExtractor.nDelimitedDataShiftedToDob;
    gender <== genderExtractor.out;

    // Extract PIN code
    component pinCodeExtractor = PinCodeExtractor(maxDataLength);
    pinCodeExtractor.nDelimitedData <== nDelimitedData;
    pinCodeExtractor.startDelimiterIndex <== delimiterIndices[pinCodePosition() - 1];
    pinCodeExtractor.endDelimiterIndex <== delimiterIndices[pinCodePosition()];
    pinCode <== pinCodeExtractor.out;

    // Extract state
    component stateExtractor = ExtractAndPackAsInt(maxDataLength, statePosition());
    stateExtractor.nDelimitedData <== nDelimitedData;
    stateExtractor.delimiterIndices <== delimiterIndices;
    state <== stateExtractor.out;

    // Extract photo
    component photoExtractor = PhotoExtractor(maxDataLength);
    photoExtractor.nDelimitedData <== nDelimitedData;
    photoExtractor.startDelimiterIndex <== delimiterIndices[photoPosition() - 1];
    photoExtractor.endIndex <== qrDataPaddedLength - 1;
    photo <== photoExtractor.out;
}