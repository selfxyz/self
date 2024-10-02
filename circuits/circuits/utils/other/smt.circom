pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./array.circom";
include "binary-merkle-root.circom";
include "getCommonLength.circom";

template SMTVerify(nLength) {
    signal input virtualValue;  // value from user's data
    signal input value; // value included in the tree
    signal input root;
    signal input siblings[nLength];
    signal input mode; // 0 for non inclusion, 1 for inclusion
    signal depth <== SiblingsLength()(siblings);

    // Calulate the path
    signal path[nLength];
    signal path_in_bits_reversed[nLength] <== Num2Bits(256)(virtualValue);
    var path_in_bits[nLength];
    
    for (var i = 0; i < nLength; i++) {
        path_in_bits[i] = path_in_bits_reversed[nLength-1-i];
    }
    
    // Shift the path to the left by depth to make it compatible for BinaryMerkleRoot function
    component ct1 = VarShiftLeft(nLength,nLength);
    ct1.in <== path_in_bits;
    ct1.shift <== (nLength-depth);
    path <== ct1.out; 

    // Closest_key to leaf
    signal leaf <== Poseidon(3)([value, 1,1]); // compute the leaf from the value
    signal isClosestZero <== IsEqual()([value,0]); // check if the inital value is 0, in that case the leaf will be 0 too, not Hash(0,1,1);
    signal leafOrZero <== leaf * (1 - isClosestZero);

    // Verification
    signal computedRoot <== BinaryMerkleRoot(nLength)(leafOrZero, depth, path, siblings);
    computedRoot === root;

    // check is leaf equals virtual leaf
    signal virtualLeaf <== Poseidon(3)([virtualValue, 1,1]);
    signal areLeafAndVirtualLeafEquals <== IsEqual()([virtualLeaf, leaf]);

    mode === areLeafAndVirtualLeafEquals;

}
