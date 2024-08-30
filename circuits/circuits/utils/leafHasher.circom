pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template LeafHasher(n, k) {
    signal input in[k];
    signal output out;

    component splitSignalsToWords = SplitSignalsToWords(n, k, 64, 64);
    splitSignalsToWords.in <== in;

    component hash[4];
    for (var i = 0; i < 4 ; i ++){
       hash[i] = Poseidon(16);
    }
    for (var i = 0; i < 64 ; i ++){
        hash[ i % 4 ].inputs[ i \ 4 ] <== splitSignalsToWords.out[i];
    }
    component finalHash = Poseidon(4);
    for (var i = 0 ; i < 4 ; i++){
        finalHash.inputs[i] <== hash[i].out;
    }
    out <== finalHash.out;
}
