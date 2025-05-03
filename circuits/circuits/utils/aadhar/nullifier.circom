// pragma circom 2.1.9;

// include "circomlib/circuits/poseidon.circom";
// include "./constants.circom";


// /// @title Nullifier
// /// @notice Computes the nullifier for an Aadhaar identity
// /// @input photo The photo of the user with SHA padding
// /// @output nullifier = hash(nullifierSeed, hash(photo[0:15]), hash(photo[16:31]))
// template Nullifier() {
//     signal input nullifierSeed;
//     signal input photo[photoPackSize()]; // 32 elements

//     signal output out;

//     // Poseidon template only support 16 inputs - so we do in two chunks (photo is 32 chunks)
//     component first16Hasher = Poseidon(16);
//     for (var i = 0; i < 16; i++) {
//         first16Hasher.inputs[i] <== photo[i];
//     }

//     component last16Hasher = Poseidon(16);
//     for (var i = 0; i < 16; i++) {
//         last16Hasher.inputs[i] <== photo[i + 16];
//     }

//     out <== Poseidon(3)([nullifierSeed, first16Hasher.out, last16Hasher.out]);
// }