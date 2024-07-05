pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "binary-merkle-root.circom";
include "./utils/getCommonLength.circom";

template ProvePassportNotInOfac(nLevels) {
    signal input mrz[93];
    signal input leaf_value;

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];
    signal input membership;
    signal output out;
    signal out1;
    signal out2;
    signal out3;

    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== mrz[49 + i];
    } 

    component poseidon_hash = Poseidon(3);
    poseidon_hash.inputs[0] <== leaf_value;
    poseidon_hash.inputs[1] <== 1;
    poseidon_hash.inputs[2] <== 1;

    signal computedRoot <== BinaryMerkleRoot(nLevels)(poseidon_hash.out, merkletree_size, path, siblings);
    component iseq = IsEqual();
    computedRoot ==> iseq.in[0];
    merkle_root ==> iseq.in[1];
    out1 <==  iseq.out; 

    // if out == false ; then proof failed as path and siblings do not compute to root
    // now if out == 1; path and siblings are true but the leaf_value given might be closest or might be actual
    // check if leaf_value = posiedon_hasher.out
    // if it is, proof == true
    // if check is false, then the given pah and siblings are correct but for closest leaf
    // now we need to prove it is the closest leaf, i.e siblings length < first common bits of hashes
    // if it is , then proof == true or else == false
    // signal output commonLength;

    // true if leaf given = leaf calulated
    component iseq2 = IsEqual();
    leaf_value ==> iseq2.in[0];
    poseidon_hasher.out ==> iseq2.in[1];
    out2 <== iseq2.out;

    component lt = LessEqThan(9);
    merkletree_size ==> lt.in[0];
    lt.in[1] <== PoseidonHashesCommonLength()(leaf_value,poseidon_hasher.out);
    out3 <== lt.out; // true if depth <= matchingbits.length

    // if 0,(any),(any) = 0 {out1,out2,out3}
    // if 1,1(any) = 1
    // if 1,0,1 = 1
    // if 1,0,0 = 0

    signal inv;
    signal mid;
    signal in <== out2+out3;
    inv <-- in!=0 ? 1/in : 0;
    mid <== in*inv;
    out <== mid*out1;

}

component main { public [ merkle_root ] } = ProvePassportNotInOfac(256);
