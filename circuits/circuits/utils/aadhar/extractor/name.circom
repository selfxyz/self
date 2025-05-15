pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../constants.circom";
include "../../passport/customHashers.circom";



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

    // var packedLength  = computeIntChunkLength(nameMaxBytes); // limbs count
    var bytesLength   = nameMaxBytes+1;                    // +1 for delimiter

    signal output namehash;
    // signal output namepacked[packedLength];
    // signal out[packedLength];

    // size= namemaxbytes + 1 for delimiter
    component selector = SelectSubArray(maxDataLength, bytesLength);
    selector.in         <== nDelimitedData;
    selector.startIndex <== startDelimiterIndex;
    selector.length     <== (endIndex - startDelimiterIndex);

    signal nameBytes[nameMaxBytes];
    // 1st element of selector is the (position index · 255),so do not copy  
    for (var i = 0; i < nameMaxBytes; i++){
        nameBytes[i] <== selector.out[i+1];
    }
    // should not assert as we copy after 1st position
    // leading delimiter (position index · 255) must match first byte
    // shiftedBytes[0] === namePosition() * 255;
   
    // /* ---------- debug dump -------- */
    // for (var i = 0; i < nameMaxBytes; i++) {
    //     log(nameBytes[i]); 
    // }

    namehash <== PackBytesAndPoseidon(nameMaxBytes)(nameBytes);
    log(namehash);
}
