pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";


/// @title ExtractAndPackAsInt
/// @notice Helper function to extract data at a position to a single int (assumes data is less than 31 bytes)
/// @dev This is only used for state now; but can work for district, name, etc if needed
/// @dev Do NOT USE FOR DATA ABOVE 31 CHARS
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
