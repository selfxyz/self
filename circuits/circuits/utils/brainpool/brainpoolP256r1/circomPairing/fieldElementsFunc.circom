pragma circom 2.0.3;

function get_fp_sgn0(a){
    return a[0] % 2; 
}

// CHUNK_SIZE bits per register
// num has CHUNK_NUMBER registers
// p has CHUNK_NUMBER registers
// CHUNK_NUMBER * CHUNK_SIZE <= 513
// p is a prime
// if num == 0 mod p, returns 0
// else computes inv = num^{ - 1} mod p using extended euclidean algorithm
// https://brilliant.org/wiki/extended-euclidean-algorithm/
function find_Fp_inverse(CHUNK_SIZE, CHUNK_NUMBER, num, p) {
    var A_MOD_P[2][150] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, 0, num, p); 
    var a[150];
    var b[150]; 
    var x[150];
    var y[150];
    var u[150];
    var v[150];

    var ret[150];

    for(var i = 0; i < CHUNK_NUMBER; i++){
        a[i] = A_MOD_P[1][i];
        b[i] = p[i];
        x[i] = 0;
        y[i] = 0;
        u[i] = 0;
        v[i] = 0;
    }
    y[0] = 1;
    u[0] = 1;
    // euclidean algorithm takes log_phi(min(a, p)) iterations, where phi is golden ratio
    // should be less than 1000 for our cases...
    for(var l = 0; l < 1000; l++){
        var k_a = 0;
        for (var i = 0; i < CHUNK_NUMBER; i++) {
            if (a[i] != 0) {
                k_a = i + 1;
            }
        }
        if (k_a == 0) {
            for (var i = 0; i < CHUNK_NUMBER; i++) {
                ret[i] = x[i];
            }
            return ret;
        }

        var r[2][150] = long_div2(CHUNK_SIZE, k_a, CHUNK_NUMBER - k_a, b, a); 
        var q[150]; 
        for(var i = 0; i < CHUNK_NUMBER - k_a + 1; i++)
            q[i] = r[0][i];
        for(var i = CHUNK_NUMBER - k_a + 1; i < CHUNK_NUMBER; i++)
            q[i] = 0;
        
        var NEW_U[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, x, prod_mod(CHUNK_SIZE, CHUNK_NUMBER, u, q, p), p); 
        var NEW_V[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, y, prod_mod(CHUNK_SIZE, CHUNK_NUMBER, v, q, p), p); 
        
        for(var i = 0; i < CHUNK_NUMBER; i++){
            b[i] = a[i];
            if(i < k_a)
                a[i] = r[1][i];
            else
                a[i] = 0;
            x[i] = u[i];
            y[i] = v[i];
            u[i] = NEW_U[i];
            v[i] = NEW_V[i];
        }
    }
    // should never reach here (loop should always return before now)
    assert(0 == 1);
    return ret;
}

// a[CHUNK_NUMBER] registers can overflow
//  assume actual value of a < 2^{CHUNK_SIZE*(CHUNK_NUMBER+m)} 
// p[CHUNK_NUMBER] registers in [0, 2^CHUNK_SIZE)
// out[2][CHUNK_NUMBER] solving
//      a = p * out[0] + out[1] with out[1] in [0,p) 
// out[0] has m registers in range [-2^CHUNK_SIZE, 2^CHUNK_SIZE)
// out[1] has CHUNK_NUMBER registers in range [0, 2^CHUNK_SIZE)
function get_signed_Fp_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, m, a, p){
    var out[2][150];
    var A_SHORT[151] = signed_long_to_short(CHUNK_SIZE, CHUNK_NUMBER, a); 

    /* // commenting out to improve speed
    // let me make sure everything is in <= CHUNK_NUMBER+m registers
    for(var j=CHUNK_NUMBER+m; j<150; j++)
        assert(A_SHORT[j] == 0);
    */

    if(A_SHORT[150] == 0){
        out = long_div2(CHUNK_SIZE, CHUNK_NUMBER, m, A_SHORT, p);    
    } else {
        var A_POS[150];
        for(var i = 0; i < CHUNK_NUMBER+m; i++) 
            A_POS[i] = -A_SHORT[i];

        var X[2][150] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, m, A_POS, p);
        // what if X[1] is 0? 
        var Y_IS_ZERO = 1;
        for(var i = 0; i < CHUNK_NUMBER; i++){
            if(X[1][i] != 0)
                Y_IS_ZERO = 0;
        }
        if(Y_IS_ZERO == 1){
            out[1] = X[1];
        } else {
            out[1] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, p, X[1]); 
            
            X[0][0]++;
            if(X[0][0] >= (1 << CHUNK_SIZE)){
                for(var i = 0; i < m - 1; i++){
                    var carry = X[0][i] \ (1 << CHUNK_SIZE); 
                    X[0][i + 1] += carry;
                    X[0][i] -= carry * (1 << CHUNK_SIZE);
                }
                assert(X[0][m - 1] < (1 << CHUNK_SIZE)); 
            }
        }
        for(var i = 0; i < m; i++)
            out[0][i] = -X[0][i]; 
    }

    return out;
}


// Implements: 
//      calls get_signed_Fp_carry_witness twice
// a[2][CHUNK_NUMBER] registers can overflow
//  assume actual value of each a[i] < (2^CHUNK_SIZE)^{CHUNK_NUMBER+m} 
// p[CHUNK_NUMBER] registers in [0, 2^CHUNK_SIZE)
// out[2][2][CHUNK_NUMBER] solving
//      a[0] = p * out[0][0] + out[0][1] with out[0][1] in [0,p) 
//      a[1] = p * out[1][0] + out[1][1] with out[1][1] in [0,p) 
// out[i][0] has m registers in range [-2^CHUNK_SIZE, 2^CHUNK_SIZE)
// out[i][1] has CHUNK_NUMBER registers in range [0, 2^CHUNK_SIZE)
function get_signed_Fp2_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, m, a, p){
    var out[2][2][150];

    for(var i = 0; i < 2; i++)
        out[i] = get_signed_Fp_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, m, a[i], p);

    return out;
}


function get_fp2_sgn0(CHUNK_NUMBER, a){
    var IS_ZERO = long_is_zero(CHUNK_NUMBER, a[0]);
    var SGN_0 = a[0][0] % 2;
    var SGN_1 = a[1][0] % 2;
    return SGN_0 | (IS_ZERO & SGN_1);
}

// helper function to precompute the product of two elements a, b in Fp2
// a[2][CHUNK_NUMBER], b[2][CHUNK_NUMBER] all registers in [0, 2^CHUNK_SIZE) 
// (a0 + a1 u)*(b0 + b1 u) = (a0*b0 - a1*b1) + (a0*b1 + a1*b0)u 
// this is a direct computation - totally distinct from the combo of Fp2multiplyNoCarry and get_Fp2_carry_witness
function find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, a, b, p){
    var out[2][150];
    var ab[2][2][150]; 
    for(var i = 0; i < 2; i++)for(var j = 0; j < 2; j++){
        ab[i][j] = prod_mod(CHUNK_SIZE,CHUNK_NUMBER,a[i],b[j],p);
    }
    out[0] = long_sub_mod(CHUNK_SIZE,CHUNK_NUMBER,ab[0][0],ab[1][1],p); 
    out[1] = long_add_mod(CHUNK_SIZE,CHUNK_NUMBER,ab[0][1],ab[1][0],p);

    return out;
}

// helper function to precompute the sum of two elements a, b in Fp2
// a[2][CHUNK_NUMBER], b[2][CHUNK_NUMBER] all registers in [0, 2^CHUNK_SIZE) 
// this is a direct computation
function find_Fp2_sum(CHUNK_SIZE, CHUNK_NUMBER, a, b, p){
    var out[2][150];
    out[0] = long_add_mod(CHUNK_SIZE,CHUNK_NUMBER,a[0],b[0],p); 
    out[1] = long_add_mod(CHUNK_SIZE,CHUNK_NUMBER,a[1],b[1],p);
    return out;
}

// helper function to precompute the difference of two elements a, b in Fp2
// a[2][CHUNK_NUMBER], b[2][CHUNK_NUMBER] all registers in [0, 2^CHUNK_SIZE) 
// this is a direct computation
function find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, a, b, p){
    var out[2][150];
    out[0] = long_sub_mod(CHUNK_SIZE,CHUNK_NUMBER,a[0],b[0],p); 
    out[1] = long_sub_mod(CHUNK_SIZE,CHUNK_NUMBER,a[1],b[1],p);
    return out;
}


// CHUNK_SIZE bits per register
// a has 2 x CHUNK_NUMBER registers, elt of Fp2
// p has CHUNK_NUMBER registers
// e has 2k registers
// CHUNK_NUMBER * CHUNK_SIZE <= 400
// p is a prime
// computes a^e in Fp2
function find_Fp2_exp(CHUNK_SIZE, CHUNK_NUMBER, a, p, e){
    var E_BITS[800]; // length is (2k - 1) * CHUNK_SIZE
    var BIT_LENGTH; 
    for (var i = 0; i < 2 * CHUNK_NUMBER; i++) {
        for (var j = 0; j < CHUNK_SIZE; j++) {
            E_BITS[j + CHUNK_SIZE * i] = (e[i] >> j) & 1;
            if(E_BITS[j + CHUNK_SIZE * i] == 1)
                BIT_LENGTH = j + CHUNK_SIZE * i + 1;
        }
    }

    var out[2][150]; // length is CHUNK_NUMBER
    for(var i = 0; i < 150; i++) {
        out[0][i] = 0;
        out[1][i] = 0;
    }
    out[0][0] = 1;

    // repeated squaring
    for(var i = BIT_LENGTH - 1; i >= 0; i--) {
        // multiply by a if bit is 0
        if (E_BITS[i] == 1)
            out = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, out, a, p);
        // square, unless we're at the end
        if (i > 0)
            out = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, out, out, p);
    }
    return out;
}

function is_equal_Fp2(CHUNK_SIZE, CHUNK_NUMBER, a, b){
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            if(a[i][idx] != b[i][idx]){
                return 0;
            }
        }
    }
    return 1;
}

// a[2][CHUNK_NUMBER] elt in Fp2 
// output multiplies by XI0 +u
// multiplies register bounds by (XI0 + 1)
function signed_Fp2_mult_w6(CHUNK_NUMBER, a, XI0){
    var out[2][150];
    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][i] = a[0][i] * XI0 - a[1][i];
        out[1][i] = a[0][i] + a[1][i] * XI0;
    }
    return out;
}


// a is 2 x CHUNK_NUMBER, represents element of Fp^2
// out is the inverse of a in Fp^2 (2 x CHUNK_NUMBER array of shorts)

// Src: https://github.com/paulmillr/noble-bls12-381/blob/23823d664b1767fb20c9c19c5800c66993b576a5/math.ts#L444
// We wish to find the multiplicative inverse of a nonzero
// element a + bu in Fp2. We leverage an identity
//
// (a + bu)(a - bu) = a² + b²
//
// which holds because u² =  - 1. This can be rewritten as
//
// (a + bu)(a - bu)/(a² + b²) = 1
//
// because a² + b² = 0 has no nonzero solutions for (a, b).
// This gives that (a - bu)/(a² + b²) is the inverse
// of (a + bu). 
function find_Fp2_inverse(CHUNK_SIZE, CHUNK_NUMBER, a, p) {
    var SQ0[150] = prod(CHUNK_SIZE, CHUNK_NUMBER, a[0], a[0]);
    var SQ1[150] = prod(CHUNK_SIZE, CHUNK_NUMBER, a[1], a[1]);
    var SQ_SUM[150] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER, SQ0, SQ1);
    var SQ_SUM_DIV[2][150] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER + 1, SQ_SUM, p);
    // LAMBDA = 1/(SQ_SUM)%p
    var LAMBDA[150] = mod_inv(CHUNK_SIZE, CHUNK_NUMBER, SQ_SUM_DIV[1], p);
    var OUT0[150] = prod(CHUNK_SIZE, CHUNK_NUMBER, LAMBDA, a[0]);
    var OUT0_DIV[2][150] = long_div(CHUNK_SIZE, CHUNK_NUMBER, OUT0, p);
    var out[2][150];
    out[0] = OUT0_DIV[1];
    
    var OUT1_PRE[150] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, p, a[1]);
    var OUT1[150] = prod(CHUNK_SIZE, CHUNK_NUMBER, LAMBDA, OUT1_PRE);
    var OUT1_DIV[2][150] = long_div(CHUNK_SIZE, CHUNK_NUMBER, OUT1, p);
    out[1] = OUT1_DIV[1];
    return out;
}


