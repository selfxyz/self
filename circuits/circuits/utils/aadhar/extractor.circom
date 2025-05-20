pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "./constants.circom";
include "./extractor/name.circom";
include "./extractor/age.circom";
include "./extractor/general.circom";
include "./extractor/photo.circom";
include "./extractor/timestamp.circom";
include "./extractor/helpers.circom";



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



/// @title QRDataExtractor
/// @notice Extracts the name, date, gender, photo from the Aadhaar QR data
/// @input data[maxDataLength] - QR data without the signature padded
/// @input qrDataPaddedLength - Length of the padded QR data
/// @input delimiterIndices[17] - Indices of the delimiters in the QR data
/// @output name - An array of Integers packed as big endian representing the name value
///                We dont know what is lenght of name at compile time
/// @output NameHash - poseidon hash of the name field
/// @output RefId - The four digit that encompas the aadhaar number
/// @output age - Unix timestamp representing the date of birth
/// @output gender - Single byte number representing gender
/// @output state - The state of the person 
/// @output pincode - The pin code of 
/// @output photo - Photo of the user along the SHA padding

template QRDataExtractor(maxDataLength,nameMaxBytes) {
    log("QrdataExtractor used");
    var packedLength  = computeIntChunkLength(nameMaxBytes);

    signal input data[maxDataLength];
    signal input qrDataPaddedLength;
    signal input delimiterIndices[18];
    signal input current_date[6];

    signal output Name[packedLength];
    signal output NameHash;
    signal output RefID;
    signal output timestamp;
    signal output age;
    signal output yearofbirth;
    signal output monthofbirth;
    signal output dayofbirth;
    signal output DobHash;
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
    component refIdExt = RefIdExtractor(maxDataLength);
    refIdExt.nDelimitedData   <== nDelimitedData;
    RefID <== refIdExt.RefId;

    // Extract timestamp
    component timestampExtractor = TimestampExtractor(maxDataLength);
    timestampExtractor.nDelimitedData <== nDelimitedData;
    timestamp <== timestampExtractor.timestamp;
   
    // Extract age
    // We use the year, month, day from the timestamp as the current time to calculate the age
    // This wont be precise but avoid the need for additional `currentTime` input
    // User can generate fresh QR for accuracy if needed (on their 18th birthday)
    component ageExtractor = AgeExtractor(maxDataLength);
    ageExtractor.nDelimitedData <== nDelimitedData;
    ageExtractor.startDelimiterIndex <== delimiterIndices[dobPosition() - 1];
    ageExtractor.currentYear <== timestampExtractor.year;
    ageExtractor.currentMonth <== timestampExtractor.month;
    ageExtractor.currentDay <== timestampExtractor.day;

    age <== ageExtractor.age;

    yearofbirth <== ageExtractor.year2;
    monthofbirth <== ageExtractor.month;
    dayofbirth <== ageExtractor.day;
    DobHash <== ageExtractor.DOBHash;

    // Extract Name
    component nameExtractor =NameExtractor(maxDataLength,nameMaxBytes);
    nameExtractor.nDelimitedData      <== nDelimitedData;
    nameExtractor.startDelimiterIndex <== delimiterIndices[namePosition() - 1];
    nameExtractor.endIndex            <== delimiterIndices[namePosition()];
    // Name <== nameExtractor.namepacked;
    NameHash   <== nameExtractor.namehash;

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