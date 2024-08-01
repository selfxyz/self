pragma circom 2.0.3;

function min(a, b) {
    if(a < b)
        return a;
    return b;
}

function max(a, b) {
    if(a > b)
        return a;
    return b;
}

function div_ceil_ecdsa(m, n) {
    var ret = 0;
    if (m % n == 0) {
        ret = m \ n;
    } else {
        ret = m \ n + 1;
    }
    return ret;
}

function log_ceil_ecdsa(n) {
   var n_temp = n;
   for (var i = 0; i < 254; i++) {
       if (n_temp == 0) {
          return i;
       }
       n_temp = n_temp \ 2;
   }
   return 254;
}

function SplitFn(in, n, m) {
    return [in % (1 << n), (in \ (1 << n)) % (1 << m)];
}

function SplitThreeFn(in, n, m, k) {
    return [in % (1 << n), (in \ (1 << n)) % (1 << m), (in \ (1 << n + m)) % (1 << k)];
}

// 1 if true, 0 if false
function long_gt_ecdsa(n, k, a, b) {
    for (var i = k - 1; i >= 0; i--) {
        if (a[i] > b[i]) {
            return 1;
        }
        if (a[i] < b[i]) {
            return 0;
        }
    }
    return 0;
}

function long_is_zero(k, a){
    for(var idx=0; idx<k; idx++){
        if(a[idx] != 0)
            return 0;
    }
    return 1;
}

// n bits per register
// a has k registers
// b has k registers
// output has k+1 registers
function long_add(n, k, a, b){
    var carry = 0;
    var sum[50];
    for(var i=0; i<k; i++){
        var sumAndCarry[2] = SplitFn(a[i] + b[i] + carry, n, n);
        sum[i] = sumAndCarry[0];
        carry = sumAndCarry[1];
    }
    sum[k] = carry;
    return sum;
}

// n bits per register
// a has k registers
// b has k registers
// c has k registers
// d has k registers
// output has k+1 registers
function long_add4(n, k, a, b, c, d){
    var carry = 0;
    var sum[50];
    for(var i=0; i < k; i++){
        var sumAndCarry[2] = SplitFn(a[i] + b[i] + c[i] + d[i] + carry, n, n);
        sum[i] = sumAndCarry[0];
        carry = sumAndCarry[1];
    }
    sum[k] = carry;
    return sum;
}

// n bits per register
// a has k1 registers
// b has k2 registers
// assume k1 > k2
// output has k1+1 registers
function long_add_unequal(n, k1, k2, a, b){
    var carry = 0;
    var sum[50];
    for(var i=0; i<k1; i++){
        if (i < k2) {
            var sumAndCarry[2] = SplitFn(a[i] + b[i] + carry, n, n);
            sum[i] = sumAndCarry[0];
            carry = sumAndCarry[1];
        } else {
            var sumAndCarry[2] = SplitFn(a[i] + carry, n, n);
            sum[i] = sumAndCarry[0];
            carry = sumAndCarry[1];
        }
    }
    sum[k1] = carry;
    return sum;
}

// n bits per register
// a has k registers
// b has k registers
// a >= b
function long_sub_ecdsa(n, k, a, b) {
    var diff[50];
    var borrow[50];
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
function long_scalar_mult_ecdsa(n, k, a, b) {
    var out[50];
    for (var i = 0; i < 50; i++) {
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
function long_div2(n, k, m, a, b){
    var out[2][50];
    // assume k+m < 50
    var remainder[50];
    for (var i = 0; i < m + k; i++) {
        remainder[i] = a[i];
    }

    var dividend[50];
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
        out[0][i] = short_div_ecdsa(n, k, dividend, b);
        var mult_shift[50] = long_scalar_mult_ecdsa(n, k, out[0][i], b);
        var subtrahend[50];
        for (var j = 0; j < m + k; j++) {
            subtrahend[j] = 0;
        }
        for (var j = 0; j <= k; j++) {
            if (i + j < m + k) {
               subtrahend[i + j] = mult_shift[j];
            }
        }
        remainder = long_sub_ecdsa(n, m + k, remainder, subtrahend);
    }
    for (var i = 0; i < k; i++) {
        out[1][i] = remainder[i];
    }
    out[1][k] = 0;
    return out;
}

function long_div_ecdsa(n, k, a, b) {
    return long_div2(n, k, k, a, b);
}

// n bits per register
// a has k + 1 registers
// b has k registers
// assumes leading digit of b is at least 2^(n - 1)
// 0 <= a < (2**n) * b
function short_div_norm_ecdsa(n, k, a, b) {
   var qhat = (a[k] * (1 << n) + a[k - 1]) \ b[k - 1];
   if (qhat > (1 << n) - 1) {
      qhat = (1 << n) - 1;
   }

   var mult[50] = long_scalar_mult_ecdsa(n, k, qhat, b);
   if (long_gt_ecdsa(n, k + 1, mult, a) == 1) {
      mult = long_sub_ecdsa(n, k + 1, mult, b);
      if (long_gt_ecdsa(n, k + 1, mult, a) == 1) {
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
// 0 <= a < b * 2^n
function short_div_ecdsa(n, k, a, b) {
    var scale = (1 << n) \ (1 + b[k - 1]);
    // k + 2 registers now
    var norm_a[50] = long_scalar_mult_ecdsa(n, k + 1, scale, a);
    // k + 1 registers now
    var norm_b[50] = long_scalar_mult_ecdsa(n, k, scale, b);
    
    var ret;
    if (norm_b[k] != 0) {
	ret = short_div_norm_ecdsa(n, k + 1, norm_a, norm_b);
    } else {
	ret = short_div_norm_ecdsa(n, k, norm_a, norm_b);
    }
    return ret;
}

// a = a0 + a1 * X + ... + a[k-1] * X^{k-1} with X = 2^n
//  a_i can be "negative" assume a_i in (-2^251, 2^251) 
// output is the value of a with a_i all of the same sign 
// out[50] = 0 if positive, 1 if negative
function signed_long_to_short(n, k, a){
    var out[51];
    var MAXL = 50;
    var temp[51];

    // is a positive?
    for(var i=0; i<k; i++) temp[i] = a[i];
    for(var i=k; i<=MAXL; i++) temp[i] = 0;

    var X = (1<<n); 
    for(var i=0; i<MAXL; i++){
        if(temp[i] >= 0){ // circom automatically takes care of signs in comparator 
            out[i] = temp[i] % X;
            temp[i+1] += temp[i] \ X;
        }else{
            var borrow = (-temp[i] + X - 1 ) \ X; 
            out[i] = temp[i] + borrow * X;
            temp[i+1] -= borrow;
        }
    }
    if(temp[MAXL] >= 0){
        assert(temp[MAXL]==0); // otherwise not enough registers!
        out[MAXL] = 0;
        return out;
    }
    
    // must be negative then, reset
    for(var i=0; i<k; i++) temp[i] = a[i];
    for(var i=k; i<=MAXL; i++) temp[i] = 0;

    for(var i=0; i<MAXL; i++){
        if(temp[i] < 0){
            var carry = (-temp[i]) \ X; 
            out[i] = temp[i] + carry * X;
            temp[i+1] -= carry;
        }else{
            var borrow = (temp[i] + X - 1 ) \ X; 
            out[i] = temp[i] - borrow * X;
            temp[i+1] += borrow;
        }
    }
    assert( temp[MAXL] == 0 ); 
    out[MAXL] = 1;
    return out;
}

// n bits per register
// a and b both have k registers
// out[0] has length 2 * k
// adapted from BigMulShortLong and LongToShortNoEndCarry witness computation
function prod(n, k, a, b) {
    // first compute the intermediate values. taken from BigMulShortLong
    var prod_val[50]; // length is 2 * k - 1
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

    // now do a bunch of carrying to make sure registers not overflowed. taken from LongToShortNoEndCarry
    var out[50]; // length is 2 * k

    var split[50][3]; // first dimension has length 2 * k - 1
    for (var i = 0; i < 2 * k - 1; i++) {
        split[i] = SplitThreeFn(prod_val[i], n, n, n);
    }

    var carry[50]; // length is 2 * k - 1
    carry[0] = 0;
    out[0] = split[0][0];
    if (2 * k - 1 > 1) {
        var sumAndCarry[2] = SplitFn(split[0][1] + split[1][0], n, n);
        out[1] = sumAndCarry[0];
        carry[1] = sumAndCarry[1];
    }
    if (2 * k - 1 > 2) {
        for (var i = 2; i < 2 * k - 1; i++) {
            var sumAndCarry[2] = SplitFn(split[i][0] + split[i-1][1] + split[i-2][2] + carry[i-1], n, n);
            out[i] = sumAndCarry[0];
            carry[i] = sumAndCarry[1];
        }
        out[2 * k - 1] = split[2*k-2][1] + split[2*k-3][2] + carry[2*k-2];
    }
    return out;
}


// n bits per register
// a and b both have l x k registers
// out has length 2l - 1 x 2k
// adapted from BigMultShortLong2D and LongToShortNoEndCarry2 witness computation
function prod2D(n, k, l, a, b) {
    // first compute the intermediate values. taken from BigMulShortLong
    var prod_val[20][50]; // length is 2l - 1 by 2k - 1
    for (var i = 0; i < 2 * k - 1; i++) {
        for (var j = 0; j < 2 * l - 1; j ++) {
            prod_val[j][i] = 0;
        }
    }
    for (var i1 = 0; i1 < k; i1 ++) {
        for (var i2 = 0; i2 < k; i2 ++) {
            for (var j1 = 0; j1 < l; j1 ++) {
                for (var j2 = 0; j2 < l; j2 ++) {
                    prod_val[j1+j2][i1+i2] = prod_val[j1+j2][i1+i2] + a[j1][i1] * b[j2][i2];
                }
            }
        }
    }

    // now do a bunch of carrying to make sure registers not overflowed. taken from LongToShortNoEndCarry2
    var out[20][50]; // length is 2 * l by 2 * k

    var split[20][50][3]; // second dimension has length 2 * k - 1
    for (var j = 0; j < 2 * l - 1; j ++) {
        for (var i = 0; i < 2 * k - 1; i++) {
            split[j][i] = SplitThreeFn(prod_val[j][i], n, n, n);
        }
    }

    var carry[20][50]; // length is 2l-1 x 2k
    var sumAndCarry[20][2];
    for ( var j = 0; j < 2 * l - 1; j ++) {
        carry[j][0] = 0;
        out[j][0] = split[j][0][0];
        if (2 * k - 1 > 1) {
            sumAndCarry[j] = SplitFn(split[j][0][1] + split[j][1][0], n, n);
            out[j][1] = sumAndCarry[j][0];
            carry[j][1] = sumAndCarry[j][1];
        }
        if (2 * k - 1 > 2) {
            for (var i = 2; i < 2 * k - 1; i++) {
                sumAndCarry[j] = SplitFn(split[j][i][0] + split[j][i-1][1] + split[j][i-2][2] + carry[j][i-1], n, n);
                out[j][i] = sumAndCarry[j][0];
                carry[j][i] = sumAndCarry[j][1];
            }
            out[j][2 * k - 1] = split[j][2*k-2][1] + split[j][2*k-3][2] + carry[j][2*k-2];
        }
    }

    return out;
}

// Put all modular arithmetic, aka F_p field stuff, at the end

function long_add_mod(n, k, a, b, p) {
    var sum[50] = long_add(n,k,a,b); 
    var temp[2][50] = long_div2(n,k,1,sum,p);
    return temp[1];
}

function long_sub_mod(n, k, a, b, p) {
    if(long_gt_ecdsa(n, k, b, a) == 1){
        return long_add(n, k, a, long_sub_ecdsa(n,k,p,b));
    }else{
        return long_sub_ecdsa(n, k, a, b);
    }
}

function prod_mod(n, k, a, b, p) {
    var prod[50] = prod(n,k,a,b);
    var temp[2][50] = long_div_ecdsa(n,k,prod,p);
    return temp[1];
}


// n bits per register
// a has k registers
// p has k registers
// e has k registers
// k * n <= 500
// p is a prime
// computes a^e mod p
function mod_exp(n, k, a, p, e) {
    var eBits[500]; // length is k * n
    var bitlength; 
    for (var i = 0; i < k; i++) {
        for (var j = 0; j < n; j++) {
            eBits[j + n * i] = (e[i] >> j) & 1;
            if(eBits[j + n * i] == 1)
                bitlength = j + n * i + 1;
        }
    }

    var out[50]; // length is k
    for (var i = 0; i < 50; i++) {
        out[i] = 0;
    }
    out[0] = 1;

    // repeated squaring
    for (var i = bitlength-1; i >= 0; i--) {
        // multiply by a if bit is 0
        if (eBits[i] == 1) {
            var temp[50]; // length 2 * k
            temp = prod(n, k, out, a);
            var temp2[2][50];
            temp2 = long_div_ecdsa(n, k, temp, p);
            out = temp2[1];
        }

        // square, unless we're at the end
        if (i > 0) {
            var temp[50]; // length 2 * k
            temp = prod(n, k, out, out);
            var temp2[2][50];
            temp2 = long_div_ecdsa(n, k, temp, p);
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
function mod_inv(n, k, a, p) {
    var isZero = 1;
    for (var i = 0; i < k; i++) {
        if (a[i] != 0) {
            isZero = 0;
        }
    }
    if (isZero == 1) {
        var ret[50];
        for (var i = 0; i < k; i++) {
            ret[i] = 0;
        }
        return ret;
    }

    var pCopy[50];
    for (var i = 0; i < 50; i++) {
        if (i < k) {
            pCopy[i] = p[i];
        } else {
            pCopy[i] = 0;
        }
    }

    var two[50];
    for (var i = 0; i < 50; i++) {
        two[i] = 0;
    }
    two[0] = 2;

    var pMinusTwo[50];
    pMinusTwo = long_sub_ecdsa(n, k, pCopy, two); // length k
    var out[50];
    out = mod_exp(n, k, a, pCopy, pMinusTwo);
    return out;
}

