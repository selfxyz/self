pragma circom 2.1.9;
include "../crypto/bigInt/bigIntFunc.circom";
include "circomlib/circuits/poseidon.circom";

template CustomHasher(k) {
    signal input in[k];
    var rounds =  div_ceil(k, 16);
    assert(rounds < 17);
    
    component hash[rounds];
    for (var i = 0; i < rounds ; i ++){
        hash[i] = Poseidon(16);
    }
    
    for (var i = 0; i < rounds ; i ++){
        for (var j = 0; j < 16 ; j ++){
            if (i * 16 + j < k){
                hash[i].inputs[j] <== in[i * 16 + j];
            } else {
                hash[i].inputs[j] <== 0;
            }
        }
    }

    component finalHash = Poseidon(rounds);
    for (var i = 0 ; i < rounds ; i++) {
        finalHash.inputs[i] <== hash[i].out;
    }
    signal output out <== finalHash.out;
}

template LeafHasher(k) {
    signal input in[k];
    signal input sigAlg;
    component leafHasher = CustomHasher(k+1);
    leafHasher.in[0] <== sigAlg;
    for (var i = 0; i < k; i++){
        leafHasher.in[i+1] <== in[i];
    }
    signal output out <== leafHasher.out;
}