pragma circom 2.1.5;
include "circomlib/circuits/bitify.circom";

template SplitBytesToWords (l,n,k) {
    signal input in[l];
    signal output out[k];
    component num2bits[l];
    for (var i = 0 ; i < l ; i++){
        num2bits[i] = Num2Bits(8);
        num2bits[i].in <== in[i];
    }
    component bits2num[k];
    for (var i = 0 ; i < k ; i++){
        bits2num[i] = Bits2Num(n);
        for(var j = 0 ; j < n ; j++){
            if(i*n + j >=  8 * l){
                bits2num[i].in[j] <==  0;
            }
            else{
                bits2num[i].in[j] <== num2bits[l - (( i * n + j) \ 8) - 1].out[ ((i * n + j) % 8)];
            }
        }
    }
    for( var i = 0 ; i< k ; i++){
    out[i] <== bits2num[i].out;
    }
}