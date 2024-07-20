pragma circom 2.0.3;

include "bigInt_func.circom";

function get_fp_sgn0(a){
    return a[0] % 2; 
}

// n bits per register
// num has k registers
// p has k registers
// k * n <= 500
// p is a prime
// if num == 0 mod p, returns 0
// else computes inv = num^{-1} mod p using extended euclidean algorithm
// https://brilliant.org/wiki/extended-euclidean-algorithm/
function find_Fp_inverse(n, k, num, p) {
    var amodp[2][50] = long_div2(n, k, 0, num, p); 
    var a[50];
    var b[50]; 
    var x[50];
    var y[50];
    var u[50];
    var v[50];

    var ret[50];

    for(var i=0; i<k; i++){
        a[i] = amodp[1][i];
        b[i] = p[i];
        x[i] = 0;
        y[i] = 0;
        u[i] = 0;
        v[i] = 0;
    }
    y[0] = 1;
    u[0] = 1;
    // euclidean algorithm takes log_phi( min(a, p) ) iterations, where phi is golden ratio
    // should be less than 1000 for our cases...
    for(var l=0; l<1000; l++){
        var ka = 0;
        for (var i = 0; i < k; i++) {
            if (a[i] != 0) {
                ka = i + 1;
            }
        }
        if (ka == 0) {
            for (var i = 0; i < k; i++) {
                ret[i] = x[i];
            }
            return ret;
        }

        var r[2][50] = long_div2(n, ka, k - ka, b, a); 
        var q[50]; 
        for(var i = 0; i < k - ka + 1; i++)
            q[i] = r[0][i];
        for(var i = k - ka + 1; i < k; i++)
            q[i] = 0;
        
        var newu[50] = long_sub_mod(n, k, x, prod_mod(n, k, u, q, p), p); 
        var newv[50] = long_sub_mod(n, k, y, prod_mod(n, k, v, q, p), p); 
        
        for(var i = 0; i < k; i++){
            b[i] = a[i];
            if( i < ka )
                a[i] = r[1][i];
            else
                a[i] = 0;
            x[i] = u[i];
            y[i] = v[i];
            u[i] = newu[i];
            v[i] = newv[i];
        }
    }
    // should never reach here (loop should always return before now)
    assert(0 == 1);
    return ret;
}

// a[k] registers can overflow
//  assume actual value of a < 2^{n*(k+m)} 
// p[k] registers in [0, 2^n)
// out[2][k] solving
//      a = p * out[0] + out[1] with out[1] in [0,p) 
// out[0] has m registers in range [-2^n, 2^n)
// out[1] has k registers in range [0, 2^n)
function get_signed_Fp_carry_witness(n, k, m, a, p){
    var out[2][50];
    var a_short[51] = signed_long_to_short(n, k, a); 

    /* // commenting out to improve speed
    // let me make sure everything is in <= k+m registers
    for(var j=k+m; j<50; j++)
        assert( a_short[j] == 0 );
    */

    if(a_short[50] == 0){
        out = long_div2(n, k, m, a_short, p);    
    }else{
        var a_pos[50];
        for(var i=0; i<k+m; i++) 
            a_pos[i] = -a_short[i];

        var X[2][50] = long_div2(n, k, m, a_pos, p);
        // what if X[1] is 0? 
        var Y_is_zero = 1;
        for(var i=0; i<k; i++){
            if(X[1][i] != 0)
                Y_is_zero = 0;
        }
        if( Y_is_zero == 1 ){
            out[1] = X[1];
        }else{
            out[1] = long_sub_ecdsa(n, k, p, X[1]); 
            
            X[0][0]++;
            if(X[0][0] >= (1<<n)){
                for(var i=0; i<m-1; i++){
                    var carry = X[0][i] \ (1<<n); 
                    X[0][i+1] += carry;
                    X[0][i] -= carry * (1<<n);
                }
                assert( X[0][m-1] < (1<<n) ); 
            }
        }
        for(var i=0; i<m; i++)
            out[0][i] = -X[0][i]; 
    }

    return out;
}


// Implements: 
//      calls get_signed_Fp_carry_witness twice
// a[2][k] registers can overflow
//  assume actual value of each a[i] < (2^n)^{k+m} 
// p[k] registers in [0, 2^n)
// out[2][2][k] solving
//      a[0] = p * out[0][0] + out[0][1] with out[0][1] in [0,p) 
//      a[1] = p * out[1][0] + out[1][1] with out[1][1] in [0,p) 
// out[i][0] has m registers in range [-2^n, 2^n)
// out[i][1] has k registers in range [0, 2^n)
function get_signed_Fp2_carry_witness(n, k, m, a, p){
    var out[2][2][50];

    for(var i=0; i<2; i++)
        out[i] = get_signed_Fp_carry_witness(n, k, m, a[i], p);

    return out;
}


function get_fp2_sgn0(k, a){
    var z = long_is_zero(k, a[0]);
    var sgn0 = a[0][0] % 2;
    var sgn1 = a[1][0] % 2;
    return sgn0 | (z & sgn1);
}

// helper function to precompute the product of two elements a, b in Fp2
// a[2][k], b[2][k] all registers in [0, 2^n) 
// (a0 + a1 u)*(b0 + b1 u) = (a0*b0 - a1*b1) + (a0*b1 + a1*b0)u 
// this is a direct computation - totally distinct from the combo of Fp2multiplyNoCarry and get_Fp2_carry_witness
function find_Fp2_product(n, k, a, b, p){
    var out[2][50];
    var ab[2][2][50]; 
    for(var i=0; i<2; i++)for(var j=0; j<2; j++){
        ab[i][j] = prod_mod(n,k,a[i],b[j],p);
    }
    out[0] = long_sub_mod(n,k,ab[0][0],ab[1][1],p); 
    out[1] = long_add_mod(n,k,ab[0][1],ab[1][0],p);

    return out;
}

// helper function to precompute the sum of two elements a, b in Fp2
// a[2][k], b[2][k] all registers in [0, 2^n) 
// this is a direct computation
function find_Fp2_sum(n, k, a, b, p){
    var out[2][50];
    out[0] = long_add_mod(n,k,a[0],b[0],p); 
    out[1] = long_add_mod(n,k,a[1],b[1],p);
    return out;
}

// helper function to precompute the difference of two elements a, b in Fp2
// a[2][k], b[2][k] all registers in [0, 2^n) 
// this is a direct computation
function find_Fp2_diff(n, k, a, b, p){
    var out[2][50];
    out[0] = long_sub_mod(n,k,a[0],b[0],p); 
    out[1] = long_sub_mod(n,k,a[1],b[1],p);
    return out;
}


// n bits per register
// a has 2 x k registers, elt of Fp2
// p has k registers
// e has 2k registers
// k * n <= 400
// p is a prime
// computes a^e in Fp2
function find_Fp2_exp(n, k, a, p, e){
    var eBits[800]; // length is (2k-1) * n
    var bitLength; 
    for (var i = 0; i < 2*k; i++) {
        for (var j = 0; j < n; j++) {
            eBits[j + n * i] = (e[i] >> j) & 1;
            if(eBits[j + n * i] == 1)
                bitLength = j + n * i + 1;
        }
    }

    var out[2][50]; // length is k
    for(var i = 0; i < 50; i++) {
        out[0][i] = 0;
        out[1][i] = 0;
    }
    out[0][0] = 1;

    // repeated squaring
    for(var i = bitLength-1; i >= 0; i--) {
        // multiply by a if bit is 0
        if (eBits[i] == 1)
            out = find_Fp2_product(n, k, out, a, p);
        // square, unless we're at the end
        if (i > 0)
            out = find_Fp2_product(n, k, out, out, p);
    }
    return out;
}

function is_equal_Fp2(n, k, a, b){
    for(var i=0; i<2; i++)for(var idx=0; idx<k; idx++){
        if(a[i][idx] != b[i][idx])
            return 0;
    }
    return 1;
}

// a[2][k] elt in Fp2 
// output multiplies by XI0 +u
// multiplies register bounds by (XI0 + 1)
function signed_Fp2_mult_w6(k, a, XI0){
    var out[2][50];
    for(var i=0; i<k; i++){
        out[0][i] = a[0][i]*XI0 - a[1][i];
        out[1][i] = a[0][i] + a[1][i]*XI0;
    }
    return out;
}


// a is 2 x k, represents element of Fp^2
// out is the inverse of a in Fp^2 (2 x k array of shorts)

// Src: https://github.com/paulmillr/noble-bls12-381/blob/23823d664b1767fb20c9c19c5800c66993b576a5/math.ts#L444
// We wish to find the multiplicative inverse of a nonzero
// element a + bu in Fp2. We leverage an identity
//
// (a + bu)(a - bu) = a² + b²
//
// which holds because u² = -1. This can be rewritten as
//
// (a + bu)(a - bu)/(a² + b²) = 1
//
// because a² + b² = 0 has no nonzero solutions for (a, b).
// This gives that (a - bu)/(a² + b²) is the inverse
// of (a + bu). 
function find_Fp2_inverse(n, k, a, p) {
    var sq0[50] = prod(n, k, a[0], a[0]);
    var sq1[50] = prod(n, k, a[1], a[1]);
    var sq_sum[50] = long_add(n, 2*k, sq0, sq1);
    var sq_sum_div[2][50] = long_div2(n, k, k+1, sq_sum, p);
    // lambda = 1/(sq_sum)%p
    var lambda[50] = mod_inv(n, k, sq_sum_div[1], p);
    var out0[50] = prod(n, k, lambda, a[0]);
    var out0_div[2][50] = long_div_ecdsa(n, k, out0, p);
    var out[2][50];
    out[0] = out0_div[1];
    
    var out1_pre[50] = long_sub_ecdsa(n, k, p, a[1]);
    var out1[50] = prod(n, k, lambda, out1_pre);
    var out1_div[2][50] = long_div_ecdsa(n, k, out1, p);
    out[1] = out1_div[1];
    return out;
}


