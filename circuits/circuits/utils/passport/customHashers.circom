pragma circom 2.1.9;
include "../crypto/bigInt/bigIntFunc.circom";
include "circomlib/circuits/poseidon.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";

template CustomHasher(k) {
    signal input in[k];
    signal output out;

    if (k < 16){
        component hash = Poseidon(k);
        for (var i = 0; i < k; i++){
            hash.inputs[i] <== in[i];
        }
        out <== hash.out;
    }

    else{
        // do up to 16 rounds of poseidon
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
        out <== finalHash.out;
    }
}

template PackBytesAndPoseidon(k) {
    var packed_length = computeIntChunkLength(k);
    signal input in[k];
    signal packed[packed_length] <== PackBytes(k)(in);
    signal output out <== CustomHasher(packed_length)(packed);
}