// pragma circom 2.1.6;

// // Here is operation to convert number to bit array and bit array to number
// // There are reasons for code to look so bad
// // We don`t use loop because of circom compiler
// // Circom compiler just ignores linear constraints (only +):
// // if u compile circuits with only linear constraints with --O2 flag (maybe --O1 too), there will be 0 constraints
// // It means that u can can put literally anything in witness and get valid proof, and we don`t want this to happen
// // To avoid it we must use quadratic constraints (where * is).
// // Here we use bit * bit instead bit in one place of constraint, and it doesn`t affects logic (0 * 0 == 0 and 1 * 1 == 1)
// // Where we can`t use it we use dummy input - it must be zero to pass dummy * dummy === 0 check, and add it to any linear constaint:
// // signal a <== b + c + dummy * dummy;
// // Nothing changes for arithmetic, but we turned linear contraint into quadratic, any compiler optimisation will not affect it.
// // Hope this will be changed in future circom version, but this is the best way to deal with it for now.

// // Convert number to bit array of len
// // We are checking if out[i] is a bit, so LEN + 1 constraints
// template Num2Bits(LEN) {
//     assert(LEN <= 253);
//     assert(LEN > 0);

//     signal input in;
//     signal output out[LEN];

//     for (var i = 0; i < LEN; i++) {
//         out[i] <-- (in >> i) & 1;
//         out[i] * (out[i] - 1) === 0;
//     }

//     signal sum[LEN];
//     sum[0] <== out[0] * out[0];

//     for (var i = 1; i < LEN; i++) {
//         sum[i] <== 2 ** i * out[i] + sum[i - 1];
//     }

//     in === sum[LEN - 1];
// }

// // Here bit check is not present, use only with bits else error will appear!!!
// // No bit check so only 1 constarint
// template Bits2Num(LEN) {
//     assert(LEN <= 253);
//     assert(LEN > 0);

//     signal input in[LEN];
//     signal output out;
    
//     signal sum[LEN];
//     sum[0] <== in[0] * in[0];
    
//     for (var i = 1; i < LEN; i++) {
//         sum[i] <== 2 ** i * in[i] + sum[i - 1];
//     }

//    	out <== sum[LEN-1];
// }
