pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template LeafHasher (k) {
    signal input in[k];
    signal output out;
    component hash[4];
    for (var i = 0; i < 4 ; i ++){
       hash[i] = Poseidon(16);
    }
    for (var i = 0; i < 64 ; i ++){
        if (i < k ){
        hash[ i % 4 ].inputs[ i \ 4 ] <== in[i];
        }
        else{
        hash[ i % 4 ].inputs[ i \ 4 ] <== 0;
        }
    }
    component finalHash = Poseidon(4);
    for (var i = 0 ; i < 4 ; i++){
        finalHash.inputs[i] <== hash[i].out;
    }
    log(finalHash.out);
    out <== finalHash.out;
}
