// pragma circom 2.1.9;
 
// include "circom-dl/circuits/bigInt/bigInt.circom";

// // CHUNK_NUMBER is the length of the base and modulus
// // calculates (base^exp) % modulus, exp = 2^(E_BITS - 1) + 1 = 2^16 + 1
// template PowerMod(CHUNK_SIZE, CHUNK_NUMBER, E_BITS) {
//     assert(E_BITS >= 2);

//     signal input base[CHUNK_NUMBER];
//     signal input modulus[CHUNK_NUMBER];

//     signal output out[CHUNK_NUMBER];

//     component muls[E_BITS];

//     for (var i = 0; i < E_BITS; i++) {
//         muls[i] = BigMultModPOptimized(CHUNK_SIZE, CHUNK_NUMBER);

//         for (var j = 0; j < CHUNK_NUMBER; j++) {
//             muls[i].p[j] <== modulus[j];
//         }
//     }

//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         muls[0].a[i] <== base[i];
//         muls[0].b[i] <== base[i];
//     }

//     for (var i = 1; i < E_BITS - 1; i++) {
//         for (var j = 0; j < CHUNK_NUMBER; j++) {
//             muls[i].a[j] <== muls[i - 1].out[j];
//             muls[i].b[j] <== muls[i - 1].out[j];
//         }
//     }

//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         muls[E_BITS - 1].a[i] <== base[i];
//         muls[E_BITS - 1].b[i] <== muls[E_BITS - 2].out[i];
//     }

//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         out[i] <== muls[E_BITS - 1].out[i];
//     }
// }
