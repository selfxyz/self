pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../constants.circom";
include "../BytesToTimestamp.circom";


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