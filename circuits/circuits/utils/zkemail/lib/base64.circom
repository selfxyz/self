pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";


/// @title Base64Decode
/// @notice Decodes a Base64 encoded string to array of bytes.
/// @notice Only support inputs with length = `byteLength` (no 0 padding).
/// @notice It is known that padding char '=' can be replaed with `A` to produce the same output
///         as Base64Lookup returns `0` for both, but a pracical attack from this is unlikely.
/// @param byteLength Byte length of the encoded value - length of the output array.
/// @input in Base64 encoded string; assumes elements to be valid Base64 characters.
/// @output out Decoded array of bytes.
template Base64Decode_ZK_EMAIL(byteLength) {
    var charLength = 4 * ((byteLength + 2) \ 3); // 4 chars encode 3 bytes
    
    signal input in[charLength];
    signal output out[byteLength];

    component bitsIn[charLength\4][4];
    component bitsOut[charLength\4][3];
    component translate[charLength\4][4];

    var idx = 0;
    for (var i = 0; i < charLength; i += 4) {
        for (var j = 0; j < 3; j++) {
            bitsOut[i\4][j] = Bits2Num(8);
        }

        for (var j = 0; j < 4; j++) {
            bitsIn[i\4][j] = Num2Bits(6);
            translate[i\4][j] = Base64Lookup();
            translate[i\4][j].in <== in[i+j];
            translate[i\4][j].out ==> bitsIn[i\4][j].in;
        }

        // Do the re-packing from four 6-bit words to three 8-bit words.
        for (var j = 0; j < 6; j++) {
            bitsOut[i\4][0].in[j+2] <== bitsIn[i\4][0].out[j];
        }
        bitsOut[i\4][0].in[0] <== bitsIn[i\4][1].out[4];
        bitsOut[i\4][0].in[1] <== bitsIn[i\4][1].out[5];

        for (var j = 0; j < 4; j++) {
            bitsOut[i\4][1].in[j+4] <== bitsIn[i\4][1].out[j];
        }
        for (var j = 0; j < 4; j++) {
            bitsOut[i\4][1].in[j] <== bitsIn[i\4][2].out[j+2];
        }

        bitsOut[i\4][2].in[6] <== bitsIn[i\4][2].out[0];
        bitsOut[i\4][2].in[7] <== bitsIn[i\4][2].out[1];
        for (var j = 0; j < 6; j++) {
            bitsOut[i\4][2].in[j] <== bitsIn[i\4][3].out[j];
        }

        for (var j = 0; j < 3; j++) {
            if (idx+j < byteLength) {
                out[idx+j] <== bitsOut[i\4][j].out;
            }
        }
        idx += 3;
    }
}


/// @title Base64Lookup
/// @notice http://0x80.pl/notesen/2016-01-17-sse-base64-decoding.html#vector-lookup-base
/// @input in input character; assumes input to be valid Base64 character (though constrained implicitly).
/// @output out output bit value.
template Base64Lookup_ZK_EMAIL() {
    signal input in;
    signal output out;

    // ['A', 'Z']
    component le_Z = LessThan(8);
    le_Z.in[0] <== in;
    le_Z.in[1] <== 90+1;

    component ge_A = GreaterThan(8);
    ge_A.in[0] <== in;
    ge_A.in[1] <== 65-1;

    signal range_AZ <== ge_A.out * le_Z.out;
    signal sum_AZ <== range_AZ * (in - 65);

    // ['a', 'z']
    component le_z = LessThan(8);
    le_z.in[0] <== in;
    le_z.in[1] <== 122+1;

    component ge_a = GreaterThan(8);
    ge_a.in[0] <== in;
    ge_a.in[1] <== 97-1;

    signal range_az <== ge_a.out * le_z.out;
    signal sum_az <== sum_AZ + range_az * (in - 71);

    // ['0', '9']
    component le_9 = LessThan(8);
    le_9.in[0] <== in;
    le_9.in[1] <== 57+1;

    component ge_0 = GreaterThan(8);
    ge_0.in[0] <== in;
    ge_0.in[1] <== 48-1;

    signal range_09 <== ge_0.out * le_9.out;
    signal sum_09 <== sum_az + range_09 * (in + 4);

    // '+'
    component equal_plus = IsZero();
    equal_plus.in <== in - 43;
    signal sum_plus <== sum_09 + equal_plus.out * (in + 19);

    // '/'
    component equal_slash = IsZero();
    equal_slash.in <== in - 47;
    signal sum_slash <== sum_plus + equal_slash.out * (in + 16);

    out <== sum_slash;

    // '='
    component equal_eqsign = IsZero();
    equal_eqsign.in <== in - 61;

    1 === range_AZ + range_az + range_09 + equal_plus.out + equal_slash.out + equal_eqsign.out;
}
