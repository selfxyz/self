pragma circom 2.1.6;
include "@zk-email/circuits/lib/fp.circom";
include "circomlib/circuits/poseidon.circom";

template LeafHasherLight(k) {
    signal input in[k];
    signal output out;
    var rounds =  div_ceil(k, 16);
    
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
    for (var i = 0 ; i < rounds ; i++){
        finalHash.inputs[i] <== hash[i].out;
    }
    out <== finalHash.out;
}
