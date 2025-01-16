pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

//----------------------------------------------------------------------------------------------------------------------------------------------------------------
// Some templates for num operations


// computes last bit of num with any bit len for 2 constraints
// returns bit (0 or 1) and div = num \ 2
template GetLastBit(){
    signal input in;
    signal output bit;
    signal output div;
    
    bit <-- in % 2;
    div <-- in \ 2;
    
    (1 - bit) * bit === 0;
    div * 2 + bit * bit === in;
}

// computes last n bits of any num
// returns array of bits and div
// in fact, this is also just a div for (2 ** N)
// for now, this is only one secured div that can be used
template GetLastNBits(N){
    signal input in;
    signal output div;
    signal output out[N];
    
    component getLastBit[N];
    for (var i = 0; i < N; i++){
        getLastBit[i] = GetLastBit();
        if (i == 0){
            getLastBit[i].in <== in;
        } else {
            getLastBit[i].in <== getLastBit[i - 1].div;
        }
        out[i] <== getLastBit[i].bit;
    }
    
    div <== getLastBit[N - 1].div;
}


// Get sum of N elements with 1 constraint.
// Use this instead of a + b + ... + c;
template GetSumOfNElements(N){ 
    assert (N >= 2);
    
    signal input in[N];
    signal output out;
    
    signal sum[N - 1];
    
    for (var i = 0; i < N - 1; i++){
        if (i == 0){
            sum[i] <== in[i] + in[i + 1];
        } else {
            sum[i] <== sum[i - 1] + in[i + 1];
        }
    }
    out <== sum[N - 2];
}