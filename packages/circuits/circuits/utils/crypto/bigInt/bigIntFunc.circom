pragma circom 2.1.6;
include "circom-bigint/circuits/bigint_func.circom";
include "./shouldUseKaratsuba.circom";


// in is an m bit number
// split into ceil(m/n) n-bit registers
function splitOverflowedRegister_dl(m, n, in) {
    var out[200];
    
    for (var i = 0; i < 200; i++) {
        out[i] = 0;
    }
    
    var nRegisters = div_ceil(m, n);
    var running = in;
    for (var i = 0; i < nRegisters; i++) {
        out[i] = running % (1 << n);
        running >>= n;
    }
    
    return out;
}

// m bits per overflowed register (values are potentially negative)
// n bits per properly-sized register
// in has k registers
// out has k + ceil(m/n) - 1 + 1 registers. highest-order potentially negative,
// all others are positive
// - 1 since the last register is included in the last ceil(m/n) array
// + 1 since the carries from previous registers could push you over
function getProperRepresentation_dl(m, n, k, in) {
    var ceilMN = 0;
    if (m % n == 0) {
        ceilMN = m \ n;
    } else {
        ceilMN = m \ n + 1;
    }
    
    var pieces[200][200];
    for (var i = 0; i < k; i++) {
        for (var j = 0; j < 200; j++) {
            pieces[i][j] = 0;
        }
        if (isNegative(in[i]) == 1) {
            var negPieces[200] = splitOverflowedRegister_dl(m, n, - 1 * in[i]);
            for (var j = 0; j < ceilMN; j++) {
                pieces[i][j] =  - 1 * negPieces[j];
            }
        } else {
            pieces[i] = splitOverflowedRegister_dl(m, n, in[i]);
        }
    }
    
    var out[200];
    var carries[200];
    for (var i = 0; i < 200; i++) {
        out[i] = 0;
        carries[i] = 0;
    }
    for (var registerIdx = 0; registerIdx < k + ceilMN; registerIdx++) {
        var thisRegisterValue = 0;
        if (registerIdx > 0) {
            thisRegisterValue = carries[registerIdx - 1];
        }
        
        var start = 0;
        if (registerIdx >= ceilMN) {
            start = registerIdx - ceilMN + 1;
        }
        
        // go from start to min(registerIdx, len(pieces)-1)
        for (var i = start; i <= registerIdx; i++) {
            if (i < k) {
                thisRegisterValue += pieces[i][registerIdx - i];
            }
        }
        
        if (isNegative(thisRegisterValue) == 1) {
            var thisRegisterAbs =  - 1 * thisRegisterValue;
            out[registerIdx] = (1 << n) - (thisRegisterAbs % (1 << n));
            carries[registerIdx] =  - 1 * (thisRegisterAbs >> n) - 1;
        } else {
            out[registerIdx] = thisRegisterValue % (1 << n);
            carries[registerIdx] = thisRegisterValue >> n;
        }
    }
    
    return out;
}

// n bits per register
// a has k registers
// b has k registers
// a >= b
function long_sub_dl(n, k, a, b) {
    var diff[200];
    var borrow[200];
    for (var i = 0; i < k; i++) {
        if (i == 0) {
            if (a[i] >= b[i]) {
                diff[i] = a[i] - b[i];
                borrow[i] = 0;
            } else {
                diff[i] = a[i] - b[i] + (1 << n);
                borrow[i] = 1;
            }
        } else {
            if (a[i] >= b[i] + borrow[i - 1]) {
                diff[i] = a[i] - b[i] - borrow[i - 1];
                borrow[i] = 0;
            } else {
                diff[i] = (1 << n) + a[i] - b[i] - borrow[i - 1];
                borrow[i] = 1;
            }
        }
    }
    return diff;
}

// a is a n-bit scalar
// b has k registers
function long_scalar_mult_dl(n, k, a, b) {
    var out[200];
    for (var i = 0; i < 200; i++) {
        out[i] = 0;
    }
    for (var i = 0; i < k; i++) {
        var temp = out[i] + (a * b[i]);
        out[i] = temp % (1 << n);
        out[i + 1] = out[i + 1] + temp \ (1 << n);
    }
    return out;
}


// n bits per register
// a has k + m registers
// b has k registers
// out[0] has length m + 1 -- quotient
// out[1] has length k -- remainder
// implements algorithm of https://people.eecs.berkeley.edu/~fateman/282/F%20Wright%20notes/week4.pdf
// b[k-1] must be nonzero!
function long_div_dl(n, k, m, a, b){
    var out[2][200];
    
    var remainder[200];
    for (var i = 0; i < m + k; i++) {
        remainder[i] = a[i];
    }
    
    var mult[200];
    var dividend[200];
    for (var i = m; i >= 0; i--) {
        if (i == m) {
            dividend[k] = 0;
            for (var j = k - 1; j >= 0; j--) {
                dividend[j] = remainder[j + m];
            }
        } else {
            for (var j = k; j >= 0; j--) {
                dividend[j] = remainder[j + i];
            }
        }
        
        out[0][i] = short_div_dl(n, k, dividend, b);
        
        var mult_shift[200] = long_scalar_mult_dl(n, k, out[0][i], b);
        var subtrahend[200];
        for (var j = 0; j < m + k; j++) {
            subtrahend[j] = 0;
        }
        for (var j = 0; j <= k; j++) {
            if (i + j < m + k) {
                subtrahend[i + j] = mult_shift[j];
            }
        }
        remainder = long_sub_dl(n, m + k, remainder, subtrahend);
    }
    for (var i = 0; i < k; i++) {
        out[1][i] = remainder[i];
    }
    out[1][k] = 0;
    
    return out;
}

function long_div_non_strict_dl(n, k, m, a, b){
    var out[2][100];
    m += k;
    while (b[k - 1] == 0) {
        out[1][k] = 0;
        k--;
        assert(k > 0);
    }
    m -= k;
    
    var remainder[200];
    for (var i = 0; i < m + k; i++) {
        remainder[i] = a[i];
    }
    
    var mult[200];
    var dividend[200];
    for (var i = m; i >= 0; i--) {
        if (i == m) {
            dividend[k] = 0;
            for (var j = k - 1; j >= 0; j--) {
                dividend[j] = remainder[j + m];
            }
        } else {
            for (var j = k; j >= 0; j--) {
                dividend[j] = remainder[j + i];
            }
        }
        
        out[0][i] = short_div_dl(n, k, dividend, b);
        
        var mult_shift[200] = long_scalar_mult_dl(n, k, out[0][i], b);
        var subtrahend[200];
        for (var j = 0; j < m + k; j++) {
            subtrahend[j] = 0;
        }
        for (var j = 0; j <= k; j++) {
            if (i + j < m + k) {
                subtrahend[i + j] = mult_shift[j];
            }
        }
        remainder = long_sub_dl(n, m + k, remainder, subtrahend);
    }
    for (var i = 0; i < k; i++) {
        out[1][i] = remainder[i];
    }
    out[1][k] = 0;
    
    return out;
}

// n bits per register
// a has k + 1 registers
// b has k registers
// assumes leading digit of b is at least 2 ** (n - 1)
// 0 <= a < (2**n) * b
function short_div_norm_dl(n, k, a, b) {
    var qhat = (a[k] * (1 << n) + a[k - 1]) \ b[k - 1];
    if (qhat > (1 << n) - 1) {
        qhat = (1 << n) - 1;
    }
    
    var mult[200] = long_scalar_mult_dl(n, k, qhat, b);
    if (long_gt(n, k + 1, mult, a) == 1) {
        mult = long_sub_dl(n, k + 1, mult, b);
        if (long_gt(n, k + 1, mult, a) == 1) {
            return qhat - 2;
        } else {
            return qhat - 1;
        }
    } else {
        return qhat;
    }
}

// n bits per register
// a has k + 1 registers
// b has k registers
// assumes leading digit of b is non-zero
// 0 <= a < (2**n) * b
function short_div_dl(n, k, a, b) {
    var scale = (1 << n) \ (1 + b[k - 1]);
    
    // k + 2 registers now
    var norm_a[200] = long_scalar_mult_dl(n, k + 1, scale, a);
    // k + 1 registers now
    var norm_b[200] = long_scalar_mult_dl(n, k, scale, b);
    
    var ret;
    if (norm_b[k] != 0) {
        ret = short_div_norm_dl(n, k + 1, norm_a, norm_b);
    } else {
        ret = short_div_norm_dl(n, k, norm_a, norm_b);
    }
    return ret;
}

// n bits per register
// a and b both have k registers
// out[0] has length 2 * k
// adapted from BigMulShortLong and LongToShortNoEndCarry2 witness computation
function prod_dl(n, k, a, b) {
    // first compute the intermediate values. taken from BigMulShortLong
    var prod_val[200];
    for (var i = 0; i < 2 * k - 1; i++) {
        prod_val[i] = 0;
        if (i < k) {
            for (var a_idx = 0; a_idx <= i; a_idx++) {
                prod_val[i] = prod_val[i] + a[a_idx] * b[i - a_idx];
            }
        } else {
            for (var a_idx = i - k + 1; a_idx < k; a_idx++) {
                prod_val[i] = prod_val[i] + a[a_idx] * b[i - a_idx];
            }
        }
    }
    
    // now do a bunch of carrying to make sure registers not overflowed. taken from LongToShortNoEndCarry2
    var out[200];
    
    var split[200][3];
    for (var i = 0; i < 2 * k - 1; i++) {
        split[i] = SplitThreeFn(prod_val[i], n, n, n);
    }
    
    var carry[200];
    carry[0] = 0;
    out[0] = split[0][0];
    if (2 * k - 1 > 1) {
        var sumAndCarry[2] = SplitFn(split[0][1] + split[1][0], n, n);
        out[1] = sumAndCarry[0];
        carry[1] = sumAndCarry[1];
    }
    if (2 * k - 1 > 2) {
        for (var i = 2; i < 2 * k - 1; i++) {
            var sumAndCarry[2] = SplitFn(split[i][0] + split[i - 1][1] + split[i - 2][2] + carry[i - 1], n, n);
            out[i] = sumAndCarry[0];
            carry[i] = sumAndCarry[1];
        }
        out[2 * k - 1] = split[2 * k - 2][1] + split[2 * k - 3][2] + carry[2 * k - 2];
    }
    return out;
}

// n bits per register
// a has k registers
// p has k registers
// e has k registers
// k * n <= 500
// p is a prime
// computes a^e mod p
function mod_exp_dl(n, k, a, p, e) {
    var eBits[1000];
    for (var i = 0; i < k; i++) {
        for (var j = 0; j < n; j++) {
            eBits[j + n * i] = (e[i] >> j) & 1;
        }
    }
    
    var out[200];
    for (var i = 0; i < 200; i++) {
        out[i] = 0;
    }
    out[0] = 1;
    
    // repeated squaring
    for (var i = k * n - 1; i >= 0; i--) {
        // multiply by a if bit is 0
        if (eBits[i] == 1) {
            var temp[200];
            temp = prod_dl(n, k, out, a);
            var temp2[2][200];
            temp2 = long_div_dl(n, k, k, temp, p);
            out = temp2[1];
        }
        
        // square, unless we're at the end
        if (i > 0) {
            var temp[200];
            temp = prod_dl(n, k, out, out);
            var temp2[2][200];
            temp2 = long_div_dl(n, k, k, temp, p);
            out = temp2[1];
        }
        
    }
    return out;
}

// n bits per register
// a has k registers
// p has k registers
// k * n <= 500
// p is a prime
// if a == 0 mod p, returns 0
// else computes inv = a^(p-2) mod p
function mod_inv_dl(n, k, a, p) {
    var isZero = 1;
    for (var i = 0; i < k; i++) {
        if (a[i] != 0) {
            isZero = 0;
        }
    }
    if (isZero == 1) {
        var ret[200];
        for (var i = 0; i < k; i++) {
            ret[i] = 0;
        }
        return ret;
    }
    
    var pCopy[200];
    for (var i = 0; i < 200; i++) {
        if (i < k) {
            pCopy[i] = p[i];
        } else {
            pCopy[i] = 0;
        }
    }
    
    var two[200];
    for (var i = 0; i < 200; i++) {
        two[i] = 0;
    }
    two[0] = 2;
    
    var pMinusTwo[200];
    pMinusTwo = long_sub_dl(n, k, pCopy, two);
    var out[200];
    out = mod_exp_dl(n, k, a, pCopy, pMinusTwo);
    return out;
}

// a, b and out are all n bits k registers
function long_sub_mod_p_dl(n, k, a, b, p){
    var gt = long_gt(n, k, a, b);
    var tmp[200];
    if (gt){
        tmp = long_sub_dl(n, k, a, b);
    }
    else {
        tmp = long_sub_dl(n, k, b, a);
    }
    var out[2][200];
    for (var i = k; i < 2 * k; i++){
        tmp[i] = 0;
    }
    out = long_div_dl(n, k, k, tmp, p);
    if (gt == 0){
        tmp = long_sub_dl(n, k, p, out[1]);
    }
    return tmp;
}

// a, b, p and out are all n bits k registers
function prod_mod_p_dl(n, k, a, b, p){
    var tmp[200];
    var result[2][200];
    tmp = prod_dl(n, k, a, b);
    result = long_div_dl(n, k, k, tmp, p);
    return result[1];
}

function long_add_mod_dl(CHUNK_SIZE, CHUNK_NUMBER, A, B, P) {
    var sum[200] = long_add_dl(CHUNK_SIZE,CHUNK_NUMBER,A,B);
    var temp[2][200] = long_div2_dl(CHUNK_SIZE,CHUNK_NUMBER,1,sum,P);
    return temp[1];
}

function long_add_dl(CHUNK_SIZE, CHUNK_NUMBER, A, B){
    var carry = 0;
    var sum[200];
    for (var i = 0; i < CHUNK_NUMBER; i++){
        var sumAndCarry[2] = SplitFn(A[i] + B[i] + carry, CHUNK_SIZE, CHUNK_SIZE);
        sum[i] = sumAndCarry[0];
        carry = sumAndCarry[1];
    }
    sum[CHUNK_NUMBER] = carry;
    return sum;
}


function long_sub_mod_dl(CHUNK_SIZE, CHUNK_NUMBER, A, B, P) {
    if (long_gt(CHUNK_SIZE, CHUNK_NUMBER, B, A) == 1){
        return long_add_dl(CHUNK_SIZE, CHUNK_NUMBER, A, long_sub_dl(CHUNK_SIZE,CHUNK_NUMBER,P,B));
    } else {
        return long_sub_dl(CHUNK_SIZE, CHUNK_NUMBER, A, B);
    }
}

function prod_mod_dl(CHUNK_SIZE, CHUNK_NUMBER, A, B, P) {
    var prod[200] = prod_dl(CHUNK_SIZE,CHUNK_NUMBER,A,B);
    var temp[2][200] = long_div_dl(CHUNK_SIZE,CHUNK_NUMBER,CHUNK_NUMBER, prod,P);
    return temp[1];
}

function long_div2_dl(CHUNK_SIZE, CHUNK_NUMBER, M, A, B){
    var out[2][200];
    // assume CHUNK_NUMBER+M < 200
    var remainder[200];
    for (var i = 0; i < M + CHUNK_NUMBER; i++) {
        remainder[i] = A[i];
    }
    
    var dividend[200];
    for (var i = M; i >= 0; i--) {
        if (i == M) {
            dividend[CHUNK_NUMBER] = 0;
            for (var j = CHUNK_NUMBER - 1; j >= 0; j--) {
                dividend[j] = remainder[j + M];
            }
        } else {
            for (var j = CHUNK_NUMBER; j >= 0; j--) {
                dividend[j] = remainder[j + i];
            }
        }
        out[0][i] = short_div_dl(CHUNK_SIZE, CHUNK_NUMBER, dividend, B);
        var MULT_SHIFT[200] = long_scalar_mult_dl(CHUNK_SIZE, CHUNK_NUMBER, out[0][i], B);
        var subtrahend[200];
        for (var j = 0; j < M + CHUNK_NUMBER; j++) {
            subtrahend[j] = 0;
        }
        for (var j = 0; j <= CHUNK_NUMBER; j++) {
            if (i + j < M + CHUNK_NUMBER) {
                subtrahend[i + j] = MULT_SHIFT[j];
            }
        }
        remainder = long_sub_dl(CHUNK_SIZE, M + CHUNK_NUMBER, remainder, subtrahend);
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[1][i] = remainder[i];
    }
    out[1][CHUNK_NUMBER] = 0;
    return out;
}

function reduce_overflow_dl(n, k, m, N){
    var M[200];
    var overflow = 0;
    for (var i = 0; i < k; i++){
        if (i == 0){
            M[i] = N[i] % (2 ** n);
            overflow = N[i] \ (2 ** n);
        } else {
            M[i] = (N[i] + overflow) % (2 ** n);
            overflow = (N[i] + overflow) \ (2 ** n);
        }
    }
    for (var i = k; i < m; i++){
        M[i] = overflow % (2 ** n);
        overflow = overflow \ (2 ** n);
    }
    
    return M;
}

function exp_to_bits_dl(exp){
    var mul_num = 0;
    var result_mul_num = 0;
    var indexes[256];
    var bits[254];
    
    var exp_clone = exp;
    var counter = 0;
    var result_counter;
    while (exp > 0){
        bits[counter] = exp % 2;
        exp = exp \ 2;
        if (bits[counter] == 1) {
            result_mul_num += 1;
            indexes[result_counter + 2] = counter;
            result_counter += 1;
        }
        mul_num += 1;
        counter++;
    }
    indexes[0] = mul_num - 1;
    indexes[1] = result_mul_num;
    
    return indexes;
    
}


// 2.5 * a ** 1,6 < a * b
function is_karatsuba_optimal_dl(a, b){
    if (a < 8){
        return 0;
    } else {
        var a_coeff = get_a_coeff(a);
        if (a_coeff > a * b){
            return 0;
        } else {
            return 1;
        }
    }
    
    return 0;
}

function isNegative_chunk_dl(x, n) {
    var x2 = x;
    for (var i = 0; i < n; i++){
        x2 = x2 \ 2;
    }
    if (x2 == 0){
        return 0;
    } else {
        return 1;
    }
}

function reduce_overflow_signed_dl(n, k, k2, max_n, in){
    var out[200];
    var clone[200];
    for (var i = 0; i < k; i++){
        clone[i] = in[i];
    }
    for (var i = 0; i < k2; i++){
        if (isNegative_chunk_dl(clone[i], max_n) == 0){
            out[i] = clone[i] % 2 ** n;
            clone[i + 1] += clone[i] \ 2 ** n;
        } else {
            if ((- 1 * clone[i]) % 2 ** n != 0){
                out[i] = 2 ** n - (- clone[i]) % 2 ** n;
                clone[i + 1] -= 1 + (- clone[i]) \ 2 ** n;
            } else {
                out[i] = 0;
                clone[i + 1] -= (- clone[i]) \ 2 ** n;
            }
        }
    }
    out[199] = 1;

    if (clone[k2] != 0){

        for (var i = 0; i < k; i++){
            clone[i] = -in[i];
        }
        for (var i = k; i < k2 + 3; i++){
            clone[i] = 0;
        }

        for (var i = 0; i < k2; i++){
            if (isNegative_chunk_dl(clone[i], max_n) == 0){
                out[i] = clone[i] % 2 ** n;
                clone[i + 1] += clone[i] \ 2 ** n;
            } else {
                if ((- 1 * clone[i]) % 2 ** n != 0){
                    out[i] = 2 ** n - (- clone[i]) % 2 ** n;
                    clone[i + 1] -= 1 + (- clone[i]) \ 2 ** n;
                } else {
                    out[i] = 0;
                    clone[i + 1] -= (- clone[i]) \ 2 ** n;
                }
            }
        }
        out[199] = 0;
    }
    
    return out;
}