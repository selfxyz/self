pragma circom 2.1.5;
include "circomlib/circuits/bitify.circom";

/// NOTE: this circuit is unaudited and should not be used in production
/// @title SplitBytesToWords
/// @notice split an array of bytes into an array of words
/// @notice useful for casting a message or modulus before RSA verification
/// @param l: number of bytes in the input array
/// @param n: number of bits in a word
/// @param k: number of words
/// @input in: array of bytes
/// @output out: array of words
template SplitSignalsToWords (l,t,n,k) {
    signal input in[l];
    signal output out[k];
    component num2bits[l];
    for (var i = 0 ; i < l ; i++){
        num2bits[i] = Num2Bits(t);
        num2bits[i].in <== in[i];
    }
    component bits2num[k];
    for (var i = 0 ; i < k ; i++){
        bits2num[i] = Bits2Num(n);
        for(var j = 0 ; j < n ; j++){
            if(i*n + j >=  t * l){
                bits2num[i].in[j] <==  0;
            }
            else{
                bits2num[i].in[j] <== num2bits[l - (( i * n + j) \ t) - 1].out[ ((i * n + j) % t)];
            }
        }
    }
    for( var i = 0 ; i< k ; i++){
    out[i] <== bits2num[i].out;
    }
}