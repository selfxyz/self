// pragma circom 2.0.3;

// function min(A, B) {
//     if(A < B)
//         return A;
//     return B;
// }

// function max(A, B) {
//     if(A > B)
//         return A;
//     return B;
// }

// function log_ceil(CHUNK_SIZE) {
//    var n_temp = CHUNK_SIZE;
//    for (var i = 0; i < 254; i++) {
//        if (n_temp == 0) {
//           return i;
//        }
//        n_temp = n_temp \ 2;
//    }
//    return 254;
// }

// function SplitFn(IN, CHUNK_SIZE, M) {
//     return [IN % (1 << CHUNK_SIZE), (IN \ (1 << CHUNK_SIZE)) % (1 << M)];
// }

// function SplitThreeFn(IN, CHUNK_SIZE, M, CHUNK_NUMBER) {
//     return [IN % (1 << CHUNK_SIZE), (IN \ (1 << CHUNK_SIZE)) % (1 << M), (IN \ (1 << CHUNK_SIZE + M)) % (1 << CHUNK_NUMBER)];
// }

// // 1 if true, 0 if false
// function long_gt(CHUNK_SIZE, CHUNK_NUMBER, A, B) {
//     for (var i = CHUNK_NUMBER - 1; i >= 0; i--) {
//         if (A[i] > B[i]) {
//             return 1;
//         }
//         if (A[i] < B[i]) {
//             return 0;
//         }
//     }
//     return 0;
// }

// function long_is_zero(CHUNK_NUMBER, A){
//     for(var idx=0; idx<CHUNK_NUMBER; idx++){
//         if(A[idx] != 0)
//             return 0;
//     }
//     return 1;
// }

// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER registers
// // B has CHUNK_NUMBER registers
// // output has CHUNK_NUMBER+1 registers
// function long_add(CHUNK_SIZE, CHUNK_NUMBER, A, B){
//     var carry = 0;
//     var sum[150];
//     for(var i=0; i<CHUNK_NUMBER; i++){
//         var sumAndCarry[2] = SplitFn(A[i] + B[i] + carry, CHUNK_SIZE, CHUNK_SIZE);
//         sum[i] = sumAndCarry[0];
//         carry = sumAndCarry[1];
//     }
//     sum[CHUNK_NUMBER] = carry;
//     return sum;
// }

// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER registers
// // B has CHUNK_NUMBER registers
// // c has CHUNK_NUMBER registers
// // d has CHUNK_NUMBER registers
// // output has CHUNK_NUMBER+1 registers
// function long_add4(CHUNK_SIZE, CHUNK_NUMBER, A, B, c, d){
//     var carry = 0;
//     var sum[150];
//     for(var i=0; i < CHUNK_NUMBER; i++){
//         var sumAndCarry[2] = SplitFn(A[i] + B[i] + c[i] + d[i] + carry, CHUNK_SIZE, CHUNK_SIZE);
//         sum[i] = sumAndCarry[0];
//         carry = sumAndCarry[1];
//     }
//     sum[CHUNK_NUMBER] = carry;
//     return sum;
// }

// // CHUNK_SIZE bits per register
// // A has K1 registers
// // B has K2 registers
// // assume K1 > K2
// // output has K1+1 registers
// function long_add_unequal(CHUNK_SIZE, K1, K2, A, B){
//     var carry = 0;
//     var sum[150];
//     for(var i=0; i<K1; i++){
//         if (i < K2) {
//             var sumAndCarry[2] = SplitFn(A[i] + B[i] + carry, CHUNK_SIZE, CHUNK_SIZE);
//             sum[i] = sumAndCarry[0];
//             carry = sumAndCarry[1];
//         } else {
//             var sumAndCarry[2] = SplitFn(A[i] + carry, CHUNK_SIZE, CHUNK_SIZE);
//             sum[i] = sumAndCarry[0];
//             carry = sumAndCarry[1];
//         }
//     }
//     sum[K1] = carry;
//     return sum;
// }

// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER registers
// // B has CHUNK_NUMBER registers
// // A >= B
// function long_sub(CHUNK_SIZE, CHUNK_NUMBER, A, B) {
//     var diff[150];
//     var borrow[150];
//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         if (i == 0) {
//            if (A[i] >= B[i]) {
//                diff[i] = A[i] - B[i];
//                borrow[i] = 0;
//             } else {
//                diff[i] = A[i] - B[i] + (1 << CHUNK_SIZE);
//                borrow[i] = 1;
//             }
//         } else {
//             if (A[i] >= B[i] + borrow[i - 1]) {
//                diff[i] = A[i] - B[i] - borrow[i - 1];
//                borrow[i] = 0;
//             } else {
//                diff[i] = (1 << CHUNK_SIZE) + A[i] - B[i] - borrow[i - 1];
//                borrow[i] = 1;
//             }
//         }
//     }
//     return diff;
// }

// // A is A CHUNK_SIZE-bit scalar
// // B has CHUNK_NUMBER registers
// function long_scalar_mult(CHUNK_SIZE, CHUNK_NUMBER, A, B) {
//     var out[150];
//     for (var i = 0; i < 150; i++) {
//         out[i] = 0;
//     }
//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         var temp = out[i] + (A * B[i]);
//         out[i] = temp % (1 << CHUNK_SIZE);
//         out[i + 1] = out[i + 1] + temp \ (1 << CHUNK_SIZE);
//     }
//     return out;
// }


// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER + M registers
// // B has CHUNK_NUMBER registers
// // out[0] has length M + 1 -- quotient
// // out[1] has length CHUNK_NUMBER -- remainder
// // implements algorithm of https://people.eecs.berkeley.edu/~fateman/282/F%20Wright%20notes/week4.pdf
// // B[CHUNK_NUMBER-1] must be nonzero!
// function long_div2(CHUNK_SIZE, CHUNK_NUMBER, M, A, B){
//     var out[2][150];
//     // assume CHUNK_NUMBER+M < 150
//     var remainder[150];
//     for (var i = 0; i < M + CHUNK_NUMBER; i++) {
//         remainder[i] = A[i];
//     }

//     var dividend[150];
//     for (var i = M; i >= 0; i--) {
//         if (i == M) {
//             dividend[CHUNK_NUMBER] = 0;
//             for (var j = CHUNK_NUMBER - 1; j >= 0; j--) {
//                 dividend[j] = remainder[j + M];
//             }
//         } else {
//             for (var j = CHUNK_NUMBER; j >= 0; j--) {
//                 dividend[j] = remainder[j + i];
//             }
//         }
//         out[0][i] = short_div(CHUNK_SIZE, CHUNK_NUMBER, dividend, B);
//         var MULT_SHIFT[150] = long_scalar_mult(CHUNK_SIZE, CHUNK_NUMBER, out[0][i], B);
//         var subtrahend[150];
//         for (var j = 0; j < M + CHUNK_NUMBER; j++) {
//             subtrahend[j] = 0;
//         }
//         for (var j = 0; j <= CHUNK_NUMBER; j++) {
//             if (i + j < M + CHUNK_NUMBER) {
//                subtrahend[i + j] = MULT_SHIFT[j];
//             }
//         }
//         remainder = long_sub(CHUNK_SIZE, M + CHUNK_NUMBER, remainder, subtrahend);
//     }
//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         out[1][i] = remainder[i];
//     }
//     out[1][CHUNK_NUMBER] = 0;
//     return out;
// }

// function long_div(CHUNK_SIZE, CHUNK_NUMBER, A, B) {
//     return long_div2(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, A, B);
// }

// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER + 1 registers
// // B has CHUNK_NUMBER registers
// // assumes leading digit of B is at least 2^(CHUNK_SIZE - 1)
// // 0 <= A < (2**CHUNK_SIZE) * B
// function short_div_norm(CHUNK_SIZE, CHUNK_NUMBER, A, B) {
//     var qhat = (A[CHUNK_NUMBER] * (1 << CHUNK_SIZE) + A[CHUNK_NUMBER - 1]) \ B[CHUNK_NUMBER - 1];
//     if (qhat > (1 << CHUNK_SIZE) - 1) {
//         qhat = (1 << CHUNK_SIZE) - 1;
//     }

//     var MULT[150] = long_scalar_mult(CHUNK_SIZE, CHUNK_NUMBER, qhat, B);
//     if (long_gt(CHUNK_SIZE, CHUNK_NUMBER + 1, MULT, A) == 1) {
//         MULT = long_sub(CHUNK_SIZE, CHUNK_NUMBER + 1, MULT, B);
//         if (long_gt(CHUNK_SIZE, CHUNK_NUMBER + 1, MULT, A) == 1) {
//             return qhat - 2;
//         } else {
//             return qhat - 1;
//         }
//     } else {
//        return qhat;
//    }
// }

// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER + 1 registers
// // B has CHUNK_NUMBER registers
// // assumes leading digit of B is non-zero
// // 0 <= A < B * 2^CHUNK_SIZE
// function short_div(CHUNK_SIZE, CHUNK_NUMBER, A, B) {
//     var scale = (1 << CHUNK_SIZE) \ (1 + B[CHUNK_NUMBER - 1]);
//     // CHUNK_NUMBER + 2 registers now
//     var norm_a[150] = long_scalar_mult(CHUNK_SIZE, CHUNK_NUMBER + 1, scale, A);
//     // CHUNK_NUMBER + 1 registers now
//     var norm_b[150] = long_scalar_mult(CHUNK_SIZE, CHUNK_NUMBER, scale, B);
    
//     var ret;
//     if (norm_b[CHUNK_NUMBER] != 0) {
// 	ret = short_div_norm(CHUNK_SIZE, CHUNK_NUMBER + 1, norm_a, norm_b);
//     } else {
// 	ret = short_div_norm(CHUNK_SIZE, CHUNK_NUMBER, norm_a, norm_b);
//     }
//     return ret;
// }

// // A = a0 + a1 * X + ... + A[CHUNK_NUMBER-1] * X^{CHUNK_NUMBER-1} with X = 2^CHUNK_SIZE
// //  a_i can be "negative" assume a_i IN (-2^251, 2^251) 
// // output is the value of A with a_i all of the same sign 
// // out[150] = 0 if positive, 1 if negative
// function signed_long_to_short(CHUNK_SIZE, CHUNK_NUMBER, A){
//     var out[151];
//     var MAXL = 150;
//     var temp[151];

//     // is A positive?
//     for(var i=0; i<CHUNK_NUMBER; i++) temp[i] = A[i];
//     for(var i=CHUNK_NUMBER; i<=MAXL; i++) temp[i] = 0;

//     var X = (1<<CHUNK_SIZE); 
//     for(var i=0; i<MAXL; i++){
//         if(temp[i] >= 0){ // circom automatically takes care of signs IN comparator 
//             out[i] = temp[i] % X;
//             temp[i+1] += temp[i] \ X;
//         }else{
//             var borrow = (-temp[i] + X - 1 ) \ X; 
//             out[i] = temp[i] + borrow * X;
//             temp[i+1] -= borrow;
//         }
//     }
//     if(temp[MAXL] >= 0){
//         assert(temp[MAXL]==0); // otherwise not enough registers!
//         out[MAXL] = 0;
//         return out;
//     }
    
//     // must be negative then, reset
//     for(var i=0; i<CHUNK_NUMBER; i++) temp[i] = A[i];
//     for(var i=CHUNK_NUMBER; i<=MAXL; i++) temp[i] = 0;

//     for(var i=0; i<MAXL; i++){
//         if(temp[i] < 0){
//             var carry = (-temp[i]) \ X; 
//             out[i] = temp[i] + carry * X;
//             temp[i+1] -= carry;
//         }else{
//             var borrow = (temp[i] + X - 1 ) \ X; 
//             out[i] = temp[i] - borrow * X;
//             temp[i+1] += borrow;
//         }
//     }
//     assert( temp[MAXL] == 0 ); 
//     out[MAXL] = 1;
//     return out;
// }

// // CHUNK_SIZE bits per register
// // A and B both have CHUNK_NUMBER registers
// // out[0] has length 2 * CHUNK_NUMBER
// // adapted from BigMulShortLong and LongToShortNoEndCarry witness computation
// function prod(CHUNK_SIZE, CHUNK_NUMBER, A, B) {
//     // first compute the intermediate values. taken from BigMulShortLong
//     var prod_val[150]; // length is 2 * CHUNK_NUMBER - 1
//     for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
//         prod_val[i] = 0;
//         if (i < CHUNK_NUMBER) {
//             for (var a_idx = 0; a_idx <= i; a_idx++) {
//                 prod_val[i] = prod_val[i] + A[a_idx] * B[i - a_idx];
//             }
//         } else {
//             for (var a_idx = i - CHUNK_NUMBER + 1; a_idx < CHUNK_NUMBER; a_idx++) {
//                 prod_val[i] = prod_val[i] + A[a_idx] * B[i - a_idx];
//             }
//         }
//     }

//     // now do A bunch of carrying to make sure registers not overflowed. taken from LongToShortNoEndCarry
//     var out[150]; // length is 2 * CHUNK_NUMBER

//     var SPLIT[150][3]; // first dimension has length 2 * CHUNK_NUMBER - 1
//     for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
//         SPLIT[i] = SplitThreeFn(prod_val[i], CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
//     }

//     var carry[150]; // length is 2 * CHUNK_NUMBER - 1
//     carry[0] = 0;
//     out[0] = SPLIT[0][0];
//     if (2 * CHUNK_NUMBER - 1 > 1) {
//         var sumAndCarry[2] = SplitFn(SPLIT[0][1] + SPLIT[1][0], CHUNK_SIZE, CHUNK_SIZE);
//         out[1] = sumAndCarry[0];
//         carry[1] = sumAndCarry[1];
//     }
//     if (2 * CHUNK_NUMBER - 1 > 2) {
//         for (var i = 2; i < 2 * CHUNK_NUMBER - 1; i++) {
//             var sumAndCarry[2] = SplitFn(SPLIT[i][0] + SPLIT[i-1][1] + SPLIT[i-2][2] + carry[i-1], CHUNK_SIZE, CHUNK_SIZE);
//             out[i] = sumAndCarry[0];
//             carry[i] = sumAndCarry[1];
//         }
//         out[2 * CHUNK_NUMBER - 1] = SPLIT[2*CHUNK_NUMBER-2][1] + SPLIT[2*CHUNK_NUMBER-3][2] + carry[2*CHUNK_NUMBER-2];
//     }
//     return out;
// }


// // CHUNK_SIZE bits per register
// // A and B both have SMALL_CHUNK_SIZE x CHUNK_NUMBER registers
// // out has length 2l - 1 x 2k
// // adapted from BigMultShortLong2D and LongToShortNoEndCarry2 witness computation
// function prod2D(CHUNK_SIZE, CHUNK_NUMBER, SMALL_CHUNK_SIZE, A, B) {
//     // first compute the intermediate values. taken from BigMulShortLong
//     var prod_val[20][150]; // length is 2l - 1 by 2k - 1
//     for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
//         for (var j = 0; j < 2 * SMALL_CHUNK_SIZE - 1; j ++) {
//             prod_val[j][i] = 0;
//         }
//     }
//     for (var i1 = 0; i1 < CHUNK_NUMBER; i1 ++) {
//         for (var i2 = 0; i2 < CHUNK_NUMBER; i2 ++) {
//             for (var j1 = 0; j1 < SMALL_CHUNK_SIZE; j1 ++) {
//                 for (var j2 = 0; j2 < SMALL_CHUNK_SIZE; j2 ++) {
//                     prod_val[j1+j2][i1+i2] = prod_val[j1+j2][i1+i2] + A[j1][i1] * B[j2][i2];
//                 }
//             }
//         }
//     }

//     // now do A bunch of carrying to make sure registers not overflowed. taken from LongToShortNoEndCarry2
//     var out[20][150]; // length is 2 * SMALL_CHUNK_SIZE by 2 * CHUNK_NUMBER

//     var SPLIT[20][150][3]; // second dimension has length 2 * CHUNK_NUMBER - 1
//     for (var j = 0; j < 2 * SMALL_CHUNK_SIZE - 1; j ++) {
//         for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
//             SPLIT[j][i] = SplitThreeFn(prod_val[j][i], CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
//         }
//     }

//     var carry[20][150]; // length is 2l-1 x 2k
//     var sumAndCarry[20][2];
//     for ( var j = 0; j < 2 * SMALL_CHUNK_SIZE - 1; j ++) {
//         carry[j][0] = 0;
//         out[j][0] = SPLIT[j][0][0];
//         if (2 * CHUNK_NUMBER - 1 > 1) {
//             sumAndCarry[j] = SplitFn(SPLIT[j][0][1] + SPLIT[j][1][0], CHUNK_SIZE, CHUNK_SIZE);
//             out[j][1] = sumAndCarry[j][0];
//             carry[j][1] = sumAndCarry[j][1];
//         }
//         if (2 * CHUNK_NUMBER - 1 > 2) {
//             for (var i = 2; i < 2 * CHUNK_NUMBER - 1; i++) {
//                 sumAndCarry[j] = SplitFn(SPLIT[j][i][0] + SPLIT[j][i-1][1] + SPLIT[j][i-2][2] + carry[j][i-1], CHUNK_SIZE, CHUNK_SIZE);
//                 out[j][i] = sumAndCarry[j][0];
//                 carry[j][i] = sumAndCarry[j][1];
//             }
//             out[j][2 * CHUNK_NUMBER - 1] = SPLIT[j][2*CHUNK_NUMBER-2][1] + SPLIT[j][2*CHUNK_NUMBER-3][2] + carry[j][2*CHUNK_NUMBER-2];
//         }
//     }

//     return out;
// }

// // Put all modular arithmetic, aka F_p field stuff, at the end

// function long_add_mod(CHUNK_SIZE, CHUNK_NUMBER, A, B, P) {
//     var sum[150] = long_add(CHUNK_SIZE,CHUNK_NUMBER,A,B); 
//     var temp[2][150] = long_div2(CHUNK_SIZE,CHUNK_NUMBER,1,sum,P);
//     return temp[1];
// }

// function long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, A, B, P) {
//     if(long_gt(CHUNK_SIZE, CHUNK_NUMBER, B, A) == 1){
//         return long_add(CHUNK_SIZE, CHUNK_NUMBER, A, long_sub(CHUNK_SIZE,CHUNK_NUMBER,P,B));
//     }else{
//         return long_sub(CHUNK_SIZE, CHUNK_NUMBER, A, B);
//     }
// }

// function prod_mod(CHUNK_SIZE, CHUNK_NUMBER, A, B, P) {
//     var prod[150] = prod(CHUNK_SIZE,CHUNK_NUMBER,A,B);
//     var temp[2][150] = long_div(CHUNK_SIZE,CHUNK_NUMBER,prod,P);
//     return temp[1];
// }


// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER registers
// // P has CHUNK_NUMBER registers
// // EXP has CHUNK_NUMBER registers
// // CHUNK_NUMBER * CHUNK_SIZE <= 500
// // P is A prime
// // computes A^EXP mod P
// function mod_exp(CHUNK_SIZE, CHUNK_NUMBER, A, P, EXP) {
//     var eBits[500]; // length is CHUNK_NUMBER * CHUNK_SIZE
//     var BIT_LENGTH; 
//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         for (var j = 0; j < CHUNK_SIZE; j++) {
//             eBits[j + CHUNK_SIZE * i] = (EXP[i] >> j) & 1;
//             if(eBits[j + CHUNK_SIZE * i] == 1)
//                 BIT_LENGTH = j + CHUNK_SIZE * i + 1;
//         }
//     }

//     var out[150]; // length is CHUNK_NUMBER
//     for (var i = 0; i < 150; i++) {
//         out[i] = 0;
//     }
//     out[0] = 1;

//     // repeated squaring
//     for (var i = BIT_LENGTH-1; i >= 0; i--) {
//         // multiply by A if bit is 0
//         if (eBits[i] == 1) {
//             var temp[150]; // length 2 * CHUNK_NUMBER
//             temp = prod(CHUNK_SIZE, CHUNK_NUMBER, out, A);
//             var temp2[2][150];
//             temp2 = long_div(CHUNK_SIZE, CHUNK_NUMBER, temp, P);
//             out = temp2[1];
//         }

//         // square, unless we're at the end
//         if (i > 0) {
//             var temp[150]; // length 2 * CHUNK_NUMBER
//             temp = prod(CHUNK_SIZE, CHUNK_NUMBER, out, out);
//             var temp2[2][150];
//             temp2 = long_div(CHUNK_SIZE, CHUNK_NUMBER, temp, P);
//             out = temp2[1];
//         }

//     }
//     return out;
// }

// // CHUNK_SIZE bits per register
// // A has CHUNK_NUMBER registers
// // P has CHUNK_NUMBER registers
// // CHUNK_NUMBER * CHUNK_SIZE <= 500
// // P is A prime
// // if A == 0 mod P, returns 0
// // else computes inv = A^(P-2) mod P
// function mod_inv(CHUNK_SIZE, CHUNK_NUMBER, A, P) {
//     var isZero = 1;
//     for (var i = 0; i < CHUNK_NUMBER; i++) {
//         if (A[i] != 0) {
//             isZero = 0;
//         }
//     }
//     if (isZero == 1) {
//         var ret[150];
//         for (var i = 0; i < CHUNK_NUMBER; i++) {
//             ret[i] = 0;
//         }
//         return ret;
//     }

//     var pCopy[150];
//     for (var i = 0; i < 150; i++) {
//         if (i < CHUNK_NUMBER) {
//             pCopy[i] = P[i];
//         } else {
//             pCopy[i] = 0;
//         }
//     }

//     var two[150];
//     for (var i = 0; i < 150; i++) {
//         two[i] = 0;
//     }
//     two[0] = 2;

//     var pMinusTwo[150];
//     pMinusTwo = long_sub(CHUNK_SIZE, CHUNK_NUMBER, pCopy, two); // length CHUNK_NUMBER
//     var out[150];
//     out = mod_exp(CHUNK_SIZE, CHUNK_NUMBER, A, pCopy, pMinusTwo);
//     return out;
// }


// function long_div_5args(n, k, m, a, b){
//     var out[2][100];
//     m += k;
//     while (b[k-1] == 0) {
//         out[1][k] = 0;
//         k--;
//         assert(k > 0);
//     }
//     m -= k;

//     var remainder[100];
//     for (var i = 0; i < m + k; i++) {
//         remainder[i] = a[i];
//     }

//     var mult[200];
//     var dividend[200];
//     for (var i = m; i >= 0; i--) {
//         if (i == m) {
//             dividend[k] = 0;
//             for (var j = k - 1; j >= 0; j--) {
//                 dividend[j] = remainder[j + m];
//             }
//         } else {
//             for (var j = k; j >= 0; j--) {
//                 dividend[j] = remainder[j + i];
//             }
//         }

//         out[0][i] = short_div(n, k, dividend, b);

//         var mult_shift[100] = long_scalar_mult_100(n, k, out[0][i], b);
//         var subtrahend[200];
//         for (var j = 0; j < m + k; j++) {
//             subtrahend[j] = 0;
//         }
//         for (var j = 0; j <= k; j++) {
//             if (i + j < m + k) {
//                subtrahend[i + j] = mult_shift[j];
//             }
//         }
//         remainder = long_sub_100(n, m + k, remainder, subtrahend);
//     }
//     for (var i = 0; i < k; i++) {
//         out[1][i] = remainder[i];
//     }
//     out[1][k] = 0;

//     return out;
// }

// // a is a n-bit scalar
// // b has k registers
// function long_scalar_mult_100(n, k, a, b) {
//     var out[100];
//     for (var i = 0; i < 100; i++) {
//         out[i] = 0;
//     }
//     for (var i = 0; i < k; i++) {
//         var temp = out[i] + (a * b[i]);
//         out[i] = temp % (1 << n);
//         out[i + 1] = out[i + 1] + temp \ (1 << n);
//     }
//     return out;
// }

// // n bits per register
// // a has k registers
// // b has k registers
// // a >= b
// function long_sub_100(n, k, a, b) {
//     var diff[100];
//     var borrow[100];
//     for (var i = 0; i < k; i++) {
//         if (i == 0) {
//            if (a[i] >= b[i]) {
//                diff[i] = a[i] - b[i];
//                borrow[i] = 0;
//             } else {
//                diff[i] = a[i] - b[i] + (1 << n);
//                borrow[i] = 1;
//             }
//         } else {
//             if (a[i] >= b[i] + borrow[i - 1]) {
//                diff[i] = a[i] - b[i] - borrow[i - 1];
//                borrow[i] = 0;
//             } else {
//                diff[i] = (1 << n) + a[i] - b[i] - borrow[i - 1];
//                borrow[i] = 1;
//             }
//         }
//     }
//     return diff;
// }