pragma circom 2.0.3;

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
// a[i], b[i] in 0... 2 * *CHUNK_SIZE - 1
// represent a = a[0] + a[1] * 2 * *CHUNK_SIZE + .. + a[CHUNK_NUMBER - 1] * 2 * *(CHUNK_SIZE * CHUNK_NUMBER)
// calculates (a+b)%p, where 0<= a,b < p 
template FpAdd(CHUNK_SIZE, CHUNK_NUMBER, p){
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];

    component add = BigAdd(CHUNK_SIZE,CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        add.a[i] <== a[i];
        add.b[i] <== b[i];
    }
    component lessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER + 1);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lessThan.a[i] <== add.out[i];
        lessThan.b[i] <== p[i];
    }
    lessThan.a[CHUNK_NUMBER] <== add.out[CHUNK_NUMBER];
    lessThan.b[CHUNK_NUMBER] <== 0; 

    component sub = BigSub(CHUNK_SIZE,CHUNK_NUMBER + 1);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        sub.a[i] <== add.out[i];
        sub.b[i] <== p[i] - lessThan.out * p[i];
    }
    sub.a[CHUNK_NUMBER] <== add.out[CHUNK_NUMBER];
    sub.b[CHUNK_NUMBER] <== 0;
    
    sub.out[CHUNK_NUMBER] === 0;
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[i] <== sub.out[i];
    }
}

// calculates (a - b) % p, where a, b < p
// note: does not assume a >= b
template FpSubtract(CHUNK_SIZE, CHUNK_NUMBER, p){
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    component sub = BigSub(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++){
        sub.a[i] <== a[i];
        sub.b[i] <== b[i];
    }
    signal flag;
    flag <== sub.underflow;
    component add = BigAdd(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++){
        add.a[i] <== sub.out[i];
        add.b[i] <== p[i];
    }
    signal tmp[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++){
        tmp[i] <== (1 - flag) * sub.out[i];
        out[i] <== tmp[i] + flag * add.out[i];
    }
}

// Input: in <= p
// Output: -in (mod p) = p - in if in != 0, else 0 
// Constrains in <= p
template FpNegate(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];

    component neg = BigSub(CHUNK_SIZE, CHUNK_NUMBER); 
    component isZero = BigIsZero(CHUNK_NUMBER);
    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        neg.a[idx] <== p[idx];
        neg.b[idx] <== in[idx];
        
        isZero.in[idx] <== in[idx];
    }
    neg.underflow === 0; // constrain in <= p
    for(var idx = 0; idx < CHUNK_NUMBER; idx++)
        out[idx] <== (1 - isZero.out)*neg.out[idx];
}

template FpMultiply(CHUNK_SIZE, CHUNK_NUMBER, p) {
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);

    component noCarry = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        noCarry.a[i] <== a[i];
        noCarry.b[i] <== b[i];
    }
    component red = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, p, 3 * CHUNK_SIZE + 2 * LOGK);
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++)
        red.in[i] <== noCarry.out[i];

    component bigMod = SignedFpCarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK, p);
    for (var i = 0; i < CHUNK_NUMBER; i++)
        bigMod.in[i] <== red.out[i];

    for (var i = 0; i < CHUNK_NUMBER; i++)
        out[i] <== bigMod.out[i];
}

// constrain in = p * X + Y 
// in[i] in (-2^OVERFLOW, 2^OVERFLOW) 
// assume registers of X have abs value < 2^{OVERFLOW - CHUNK_SIZE - log(min(CHUNK_NUMBER,m)) - 1} 
// assume OVERFLOW - 1 >= CHUNK_SIZE 
template CheckCarryModP(CHUNK_SIZE, CHUNK_NUMBER, m, OVERFLOW, p){
    signal input in[CHUNK_NUMBER]; 
    signal input X[m];
    signal input Y[CHUNK_NUMBER];

    assert(OVERFLOW < 251);
    assert(CHUNK_SIZE <= OVERFLOW - 1);
    component pX;
    component carryCheck;

    pX = BigMultShortLongUnequal(CHUNK_SIZE, CHUNK_NUMBER, m, OVERFLOW); // p has CHUNK_NUMBER registers, X has m registers, so output really has CHUNK_NUMBER + m - 1 registers 
    // OVERFLOW register in  (-2^{OVERFLOW - 1} , 2^{OVERFLOW - 1})
    for(var i = 0; i < CHUNK_NUMBER; i++){
        pX.a[i] <== p[i];
    }
    for(var i = 0; i < m; i++){
        pX.b[i] <== X[i];
    }

    // in - p*X - Y has registers in (-2^{OVERFLOW + 1}, 2^{OVERFLOW + 1})
    carryCheck = CheckCarryToZero(CHUNK_SIZE, OVERFLOW + 1, CHUNK_NUMBER + m - 1); 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        carryCheck.in[i] <== in[i] - pX.out[i] - Y[i]; 
    }
    for(var i=CHUNK_NUMBER; i < CHUNK_NUMBER + m - 1; i++){
        carryCheck.in[i] <== -pX.out[i];
    }

}

// solve for in = p * X + out
// assume in has registers in (-2^OVERFLOW, 2^OVERFLOW) 
// X has registers lying in [-2^CHUNK_SIZE, 2^CHUNK_SIZE) 
// X has at most Ceil(OVERFLOW / CHUNK_SIZE) registers 

// out has registers in [0, 2^CHUNK_SIZE) but don't constrain out < p
template SignedFpCarryModP(CHUNK_SIZE, CHUNK_NUMBER, OVERFLOW, p){
    signal input in[CHUNK_NUMBER]; 
    var m = (OVERFLOW + CHUNK_SIZE - 1) \ CHUNK_SIZE; 
    signal output X[m];
    signal output out[CHUNK_NUMBER];

    assert(OVERFLOW < 251);

    var Xvar[2][150] = get_signed_Fp_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, m, in, p); 
    component xRangeChecks[m];
    component rangeChecks[CHUNK_NUMBER]; 
    //component lessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER); 

    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[i] <-- Xvar[1][i];
        rangeChecks[i] = Num2Bits(CHUNK_SIZE); 
        rangeChecks[i].in <== out[i];
        //lessThan.a[i] <== out[i];
        //lessThan.b[i] <== p[i];
    }
    //lessThan.out === 1;
    
    for(var i = 0; i < m; i++){
        X[i] <-- Xvar[0][i];
        xRangeChecks[i] = Num2Bits(CHUNK_SIZE + 1);
        xRangeChecks[i].in <== X[i] + (1 << CHUNK_SIZE); // X[i] should be between [-2^CHUNK_SIZE, 2^CHUNK_SIZE)
    }
    
    component modCheck = CheckCarryModP(CHUNK_SIZE, CHUNK_NUMBER, m, OVERFLOW, p);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        modCheck.in[i] <== in[i];
        modCheck.Y[i] <== out[i];
    }
    for(var i = 0; i < m; i++){
        modCheck.X[i] <== X[i];
    }
}



// Constrain in = 0 mod p by solving for in = p * X
// assume in has registers in (-2^OVERFLOW, 2^OVERFLOW) 
// X has registers lying in [-2^CHUNK_SIZE, 2^CHUNK_SIZE) 
// X has at most Ceil(OVERFLOW / CHUNK_SIZE) registers 

// save range check on Y compared to SignedFpCarryModP
template SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, OVERFLOW, p){
    signal input in[CHUNK_NUMBER]; 
    var m = (OVERFLOW + CHUNK_SIZE - 1) \ CHUNK_SIZE; 
    signal output X[m];

    assert(OVERFLOW < 251);

    var Xvar[2][150] = get_signed_Fp_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, m, in, p); 
    component xRangeChecks[m];

    for(var i = 0; i < m; i++){
        X[i] <-- Xvar[0][i];
        xRangeChecks[i] = Num2Bits(CHUNK_SIZE + 1);
        xRangeChecks[i].in <== X[i] + (1 << CHUNK_SIZE); // X[i] should be between [-2^CHUNK_SIZE, 2^CHUNK_SIZE)
    }
    
    component modCheck = CheckCarryModP(CHUNK_SIZE, CHUNK_NUMBER, m, OVERFLOW, p);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        modCheck.in[i] <== in[i];
        modCheck.Y[i] <== 0;
    }
    for(var i = 0; i < m; i++){
        modCheck.X[i] <== X[i];
    }
}

// in has CHUNK_NUMBER registers, elt of Fp
// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-11#section-4.1
// return in % 2
// This requires `in` to be the unique element < p. 
// NOTE: different from Wahby-Boneh paper https://eprint.iacr.org/2019/403.pdf and python reference code: https://github.com/algorand/bls_sigs_ref/blob/master/python-impl/opt_swu_g2.py
template FpSgn0(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[CHUNK_NUMBER];
    signal output out;

    // constrain in < p
    component lessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        lessThan.a[i] <== in[i];
        lessThan.b[i] <== p[i];
    }
    lessThan.out === 1;
    
    // note we only need in[0] ! 
    var r = in[0] % 2;
    var q = (in[0] - r) / 2; 
    out <-- r;
    signal div;
    div <-- q; 
    out * (1 - out) === 0;
    in[0] === 2 * div + out;
}

template FpIsZero(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[CHUNK_NUMBER];
    signal output out;

    // check that in < p 
    component lessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    component isZero = BigIsZero(CHUNK_NUMBER);
    for(var i = 0; i < CHUNK_NUMBER; i++) {
        lessThan.a[i] <== in[i];
        lessThan.b[i] <== p[i];

        isZero.in[i] <== in[i];
    }
    lessThan.out === 1;
    out <== isZero.out;
}

template FpIsEqual(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[2][CHUNK_NUMBER];
    signal output out;

    // check in[i] < p
    component lessThan[2];
    for(var i = 0; i < 2; i++){
        lessThan[i] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            lessThan[i].a[idx] <== in[i][idx];
            lessThan[i].b[idx] <== p[idx];
        }
        lessThan[i].out === 1;
    }

    component isEqual[CHUNK_NUMBER + 1];
    var sum = 0;
    for(var i = 0; i < CHUNK_NUMBER; i++){
        isEqual[i] = IsEqual();
        isEqual[i].in[0] <== in[0][i];
        isEqual[i].in[1] <== in[1][i];
        sum = sum + isEqual[i].out;
    }

    isEqual[CHUNK_NUMBER] = IsEqual();
    isEqual[CHUNK_NUMBER].in[0] <== sum;
    isEqual[CHUNK_NUMBER].in[1] <== CHUNK_NUMBER;
    out <== isEqual[CHUNK_NUMBER].out;
}
