pragma circom 2.0.3;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";

include "bigIntFunc.circom";
include "./optimized/bigInt/karatsuba.circom";
include "./optimized/int/arithmetic.circom";

// addition mod 2**CHUNK_SIZE with carry bit
template ModSum(CHUNK_SIZE) {
    assert(CHUNK_SIZE <= 252);
    signal input a;
    signal input b;
    signal output sum;
    signal output carry;

    component n2b = Num2Bits(CHUNK_SIZE + 1);
    n2b.in <== a + b;
    carry <== n2b.out[CHUNK_SIZE];
    sum <== a + b - carry * (1 << CHUNK_SIZE);
}

// check if CHUNK_NUMBER-register variables a, b are equal everywhere
template BigIsEqual(CHUNK_NUMBER) {
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out;

    component isEquals[CHUNK_NUMBER];
    var total = CHUNK_NUMBER;
    for (var i = 0; i < CHUNK_NUMBER; i ++) {
        isEquals[i] = IsEqual();
        isEquals[i].in[0] <== a[i];
        isEquals[i].in[1] <== b[i];
        total -= isEquals[i].out;
    }
    component checkZero = IsZero();
    checkZero.in <== total;
    out <== checkZero.out;
}

// check if CHUNK_NUMBER-register variable a is equal to zero
template BigIsZero(CHUNK_NUMBER) {
    signal input in[CHUNK_NUMBER];
    signal output out;

    component isZeros[CHUNK_NUMBER];
    var total = CHUNK_NUMBER;
    for (var i = 0; i < CHUNK_NUMBER; i ++) {
        isZeros[i] = IsZero();
        isZeros[i].in <== in[i];
        total -= isZeros[i].out;
    }
    component checkZero = IsZero();
    checkZero.in <== total;
    out <== checkZero.out;
}


// a - b
template ModSub(CHUNK_SIZE) {
    assert(CHUNK_SIZE <= 252);
    signal input a;
    signal input b;
    signal output out;
    signal output borrow;
    component lt = LessThan(CHUNK_SIZE);
    lt.in[0] <== a;
    lt.in[1] <== b;
    borrow <== lt.out;
    out <== borrow * (1 << CHUNK_SIZE) + a - b;
}

// a - b - c
// assume a - b - c + 2**CHUNK_SIZE >= 0
template ModSubThree(CHUNK_SIZE) {
    assert(CHUNK_SIZE + 2 <= 253);
    signal input a;
    signal input b;
    signal input c;
    assert(a - b - c + (1 << CHUNK_SIZE) >= 0);
    signal output out;
    signal output borrow;
    signal bPlusC;
    bPlusC <== b + c;
    component lt = LessThan(CHUNK_SIZE + 1);
    lt.in[0] <== a;
    lt.in[1] <== bPlusC;
    borrow <== lt.out;
    out <== borrow * (1 << CHUNK_SIZE) + a - bPlusC;
}

template ModSumThree(CHUNK_SIZE) {
    assert(CHUNK_SIZE + 2 <= 253);
    signal input a;
    signal input b;
    signal input c;
    signal output sum;
    signal output carry;

    component n2b = Num2Bits(CHUNK_SIZE + 2);
    n2b.in <== a + b + c;
    carry <== n2b.out[CHUNK_SIZE] + 2 * n2b.out[CHUNK_SIZE + 1];
    sum <== a + b + c - carry * (1 << CHUNK_SIZE);
}

template ModSumFour(CHUNK_SIZE) {
    assert(CHUNK_SIZE + 2 <= 253);
    signal input a;
    signal input b;
    signal input c;
    signal input d;
    signal output sum;
    signal output carry;

    component n2b = Num2Bits(CHUNK_SIZE + 2);
    n2b.in <== a + b + c + d;
    carry <== n2b.out[CHUNK_SIZE] + 2 * n2b.out[CHUNK_SIZE + 1];
    sum <== a + b + c + d - carry * (1 << CHUNK_SIZE);
}

// product mod 2**CHUNK_SIZE with carry
template ModProd(CHUNK_SIZE) {
    assert(CHUNK_SIZE <= 126);
    signal input a;
    signal input b;
    signal output prod;
    signal output carry;

    component n2b = Num2Bits(2 * CHUNK_SIZE);
    n2b.in <== a * b;

    component b2n1 = Bits2Num(CHUNK_SIZE);
    component b2n2 = Bits2Num(CHUNK_SIZE);
    var i;
    for (i = 0; i < CHUNK_SIZE; i++) {
        b2n1.in[i] <== n2b.out[i];
        b2n2.in[i] <== n2b.out[i + CHUNK_SIZE];
    }
    prod <== b2n1.out;
    carry <== b2n2.out;
}

// split a CHUNK_SIZE + M bit input into TWO outputs
template Split(CHUNK_SIZE, M) {
    assert(CHUNK_SIZE <= 126);
    signal input in;
    signal output small;
    signal output big;

    small <-- in % (1 << CHUNK_SIZE);
    big <-- in \ (1 << CHUNK_SIZE);

    component n2bSmall = Num2Bits(CHUNK_SIZE);
    n2bSmall.in <== small;
    component n2bBig = Num2Bits(M);
    n2bBig.in <== big;

    in === small + big * (1 << CHUNK_SIZE);
}

// split a CHUNK_SIZE + M + CHUNK_NUMBER bit input into three outputs
template SplitThree(CHUNK_SIZE, M, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 126);
    signal input in;
    signal output small;
    signal output medium;
    signal output big;

    small <-- in % (1 << CHUNK_SIZE);
    medium <-- (in \ (1 << CHUNK_SIZE)) % (1 << M);
    big <-- in \ (1 << CHUNK_SIZE + M);

    component n2bSmall = Num2Bits(CHUNK_SIZE);
    n2bSmall.in <== small;
    component n2bMedium = Num2Bits(M);
    n2bMedium.in <== medium;
    component n2bBig = Num2Bits(CHUNK_NUMBER);
    n2bBig.in <== big;

    in === small + medium * (1 << CHUNK_SIZE) + big * (1 << CHUNK_SIZE + M);
}

// a[i], b[i] in 0... 2**CHUNK_SIZE-1
// represent a = a[0] + a[1] * 2**CHUNK_SIZE + .. + a[CHUNK_NUMBER - 1] * 2**(CHUNK_SIZE * CHUNK_NUMBER)
template BigAdd(CHUNK_SIZE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER + 1];

    component unit0 = ModSum(CHUNK_SIZE);
    unit0.a <== a[0];
    unit0.b <== b[0];
    out[0] <== unit0.sum;

    component unit[CHUNK_NUMBER - 1];
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        unit[i - 1] = ModSumThree(CHUNK_SIZE);
        unit[i - 1].a <== a[i];
        unit[i - 1].b <== b[i];
        if (i == 1) {
            unit[i - 1].c <== unit0.carry;
        } else {
            unit[i - 1].c <== unit[i - 2].carry;
        }
        out[i] <== unit[i - 1].sum;
    }
    out[CHUNK_NUMBER] <== unit[CHUNK_NUMBER - 2].carry;
}

/* 
Polynomial Multiplication
Inputs:
    - a = a[0] + a[1] * X + ... + a[CHUNK_NUMBER-1] * X^{CHUNK_NUMBER-1}
    - b = b[0] + b[1] * X + ... + b[CHUNK_NUMBER-1] * X^{CHUNK_NUMBER-1}
Output:
    - out = out[0] + out[1] * X + ... + out[2 * CHUNK_NUMBER - 2] * X^{2*CHUNK_NUMBER - 2}
    - out = a * b as polynomials in X 
Notes:
    - Optimization due to xJsnark:
    -- witness is calculated by normal polynomial multiplication
    -- out is contrained by evaluating out(X) === a(X) * b(X) at X = 0, ..., 2*CHUNK_NUMBER - 2
    - If a[i], b[j] have absolute value < B, then out[i] has absolute value < CHUNK_NUMBER * B^2 
M_OUT is the expected max number of bits in the output registers
*/
template BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, M_OUT) {
   assert(CHUNK_SIZE <= 126);
   signal input a[CHUNK_NUMBER];
   signal input b[CHUNK_NUMBER];
   signal output out[2 * CHUNK_NUMBER - 1];

   var PROD_VAL[2 * CHUNK_NUMBER - 1];
   for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
       PROD_VAL[i] = 0;
       if (i < CHUNK_NUMBER) {
           for (var a_idx = 0; a_idx <= i; a_idx++) {
               PROD_VAL[i] = PROD_VAL[i] + a[a_idx] * b[i - a_idx];
           }
       } else {
           for (var a_idx = i - CHUNK_NUMBER + 1; a_idx < CHUNK_NUMBER; a_idx++) {
               PROD_VAL[i] = PROD_VAL[i] + a[a_idx] * b[i - a_idx];
           }
       }
       out[i] <-- PROD_VAL[i];
   }

   var k2 = 2 * CHUNK_NUMBER - 1;
   var pow[k2][k2]; // we cache the exponent values because it makes a big difference in witness generation time
   for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
       pow[i][j] = i ** j; 

   var aPoly[2 * CHUNK_NUMBER - 1];
   var bPoly[2 * CHUNK_NUMBER - 1];
   var outPoly[2 * CHUNK_NUMBER - 1];
   for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
       outPoly[i] = 0;
       aPoly[i] = 0;
       bPoly[i] = 0;
       for (var j = 0; j < 2 * CHUNK_NUMBER - 1; j++) {
           outPoly[i] = outPoly[i] + out[j] * pow[i][j];
       }
       for (var j = 0; j < CHUNK_NUMBER; j++) {
           aPoly[i] = aPoly[i] + a[j] * pow[i][j];
           bPoly[i] = bPoly[i] + b[j] * pow[i][j];
       }
   }
   for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
      outPoly[i] === aPoly[i] * bPoly[i];
   }
}

/*
same as BigMultShortLong except a has degree K_A - 1, b has degree K_B - 1
    - If a[i], b[j] have absolute value < B, then out[i] has absolute value < min(K_A, K_B) * B^2 
*/
template BigMultShortLongUnequal(CHUNK_SIZE, K_A, K_B, M_OUT) {
    assert(CHUNK_SIZE <= 126);
    signal input a[K_A];
    signal input b[K_B];
    signal output out[K_A + K_B - 1];
    
    var PROD_VAL[K_A + K_B - 1];
    for (var i = 0; i < K_A + K_B - 1; i++) {
	PROD_VAL[i] = 0;
    }
    for (var i = 0; i < K_A; i++) {
	for (var j = 0; j < K_B; j++) {
	    PROD_VAL[i + j] = PROD_VAL[i + j] + a[i] * b[j];
	}
    }
    for (var i = 0; i < K_A + K_B - 1; i++) {
       out[i] <-- PROD_VAL[i];
   }

   var k2 = K_A + K_B - 1;
   var pow[k2][k2]; 
   for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
       pow[i][j] = i ** j; 

   var aPoly[K_A + K_B - 1];
   var bPoly[K_A + K_B - 1];
   var outPoly[K_A + K_B - 1];
   for (var i = 0; i < K_A + K_B - 1; i++) {
       outPoly[i] = 0;
       aPoly[i] = 0;
       bPoly[i] = 0;
       for (var j = 0; j < K_A + K_B - 1; j++) {
           outPoly[i] = outPoly[i] + out[j] * pow[i][j];
       }
       for (var j = 0; j < K_A; j++) {
           aPoly[i] = aPoly[i] + a[j] * pow[i][j];
       }
       for (var j = 0; j < K_B; j++) {
           bPoly[i] = bPoly[i] + b[j] * pow[i][j];
       }
   }
   for (var i = 0; i < K_A + K_B - 1; i++) {
      outPoly[i] === aPoly[i] * bPoly[i];
   }
}


// in[i] contains longs
// out[i] contains shorts
template LongToShortNoEndCarry(CHUNK_SIZE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 126);
    signal input in[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER+1];

    var split[CHUNK_NUMBER][3];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        split[i] = SplitThreeFn(in[i], CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
    }

    var carry[CHUNK_NUMBER];
    carry[0] = 0;
    out[0] <-- split[0][0];
    if (CHUNK_NUMBER > 1) {
        var sumAndCarry[2] = SplitFn(split[0][1] + split[1][0], CHUNK_SIZE, CHUNK_SIZE);
        out[1] <-- sumAndCarry[0];
        carry[1] = sumAndCarry[1];
    }
    if (CHUNK_NUMBER > 2) {
        for (var i = 2; i < CHUNK_NUMBER; i++) {
            var sumAndCarry[2] = SplitFn(split[i][0] + split[i-1][1] + split[i-2][2] + carry[i-1], CHUNK_SIZE, CHUNK_SIZE);
            out[i] <-- sumAndCarry[0];
            carry[i] = sumAndCarry[1];
        }
        out[CHUNK_NUMBER] <-- split[CHUNK_NUMBER-1][1] + split[CHUNK_NUMBER-2][2] + carry[CHUNK_NUMBER-1];
    }

    component outRangeChecks[CHUNK_NUMBER+1];
    for (var i = 0; i < CHUNK_NUMBER+1; i++) {
        outRangeChecks[i] = Num2Bits(CHUNK_SIZE);
        outRangeChecks[i].in <== out[i];
    }

    signal runningCarry[CHUNK_NUMBER];
    component runningCarryRangeChecks[CHUNK_NUMBER];
    runningCarry[0] <-- (in[0] - out[0]) / (1 << CHUNK_SIZE);
    runningCarryRangeChecks[0] = Num2Bits(CHUNK_SIZE + log_ceil(CHUNK_NUMBER));
    runningCarryRangeChecks[0].in <== runningCarry[0];
    runningCarry[0] * (1 << CHUNK_SIZE) === in[0] - out[0];
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        runningCarry[i] <-- (in[i] - out[i] + runningCarry[i-1]) / (1 << CHUNK_SIZE);
        runningCarryRangeChecks[i] = Num2Bits(CHUNK_SIZE + log_ceil(CHUNK_NUMBER));
        runningCarryRangeChecks[i].in <== runningCarry[i];
        runningCarry[i] * (1 << CHUNK_SIZE) === in[i] - out[i] + runningCarry[i-1];
    }
    runningCarry[CHUNK_NUMBER-1] === out[CHUNK_NUMBER];
}

template BigMult(CHUNK_SIZE, CHUNK_NUMBER) {
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out[2 * CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    component mult = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2*CHUNK_SIZE + LOGK);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mult.a[i] <== a[i];
        mult.b[i] <== b[i];
    }

    // no carry is possible in the highest order register
    component longshort = LongToShortNoEndCarry(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1);
    for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
        longshort.in[i] <== mult.out[i];
    }
    for (var i = 0; i < 2 * CHUNK_NUMBER; i++) {
        out[i] <== longshort.out[i];
    }
}

template BigMultOptimised(CHUNK_SIZE, CHUNK_NUMBER) {
    signal input dummy;
    signal input in[2][CHUNK_NUMBER];

    signal output out[CHUNK_NUMBER * 2];

    component karatsuba = KaratsubaNoCarry(CHUNK_NUMBER);
    karatsuba.in <== in;
    karatsuba.dummy <== dummy;

    dummy * dummy === 0;

    component getLastNBits[CHUNK_NUMBER * 2 - 1];
    component bits2Num[CHUNK_NUMBER * 2 - 1];

    for (var i = 0; i < CHUNK_NUMBER * 2 - 1; i++) {
        getLastNBits[i] = GetLastNBits(CHUNK_SIZE);
        bits2Num[i] = Bits2Num(CHUNK_SIZE);

        if (i == 0) {
            getLastNBits[i].in <== karatsuba.out[i];
        } else {
            getLastNBits[i].in <== karatsuba.out[i] + getLastNBits[i - 1].div;
        }

        bits2Num[i].in <== getLastNBits[i].out;
    }

    for (var i = 0; i < CHUNK_NUMBER * 2 - 1; i++) {
        out[i] <== bits2Num[i].out;
    }

    out[CHUNK_NUMBER * 2 - 1] <== getLastNBits[CHUNK_NUMBER * 2 - 2].div;
}

/*
Inputs:
    - BigInts a, b
Output:
    - out = (a < b) ? 1 : 0
*/
template BigLessThan(CHUNK_SIZE, CHUNK_NUMBER){
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out;

    component lt[CHUNK_NUMBER];
    component eq[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lt[i] = LessThan(CHUNK_SIZE);
        lt[i].in[0] <== a[i];
        lt[i].in[1] <== b[i];
        eq[i] = IsEqual();
        eq[i].in[0] <== a[i];
        eq[i].in[1] <== b[i];
    }

    // ors[i] holds (lt[CHUNK_NUMBER - 1] || (eq[CHUNK_NUMBER - 1] && lt[CHUNK_NUMBER - 2]) .. || (eq[CHUNK_NUMBER - 1] && .. && lt[i]))
    // ands[i] holds (eq[CHUNK_NUMBER - 1] && .. && lt[i])
    // eqAnds[i] holds (eq[CHUNK_NUMBER - 1] && .. && eq[i])
    component ors[CHUNK_NUMBER - 1];
    component ands[CHUNK_NUMBER - 1];
    component eqAnds[CHUNK_NUMBER - 1];
    for (var i = CHUNK_NUMBER - 2; i >= 0; i--) {
        ands[i] = AND();
        eqAnds[i] = AND();
        ors[i] = OR();

        if (i == CHUNK_NUMBER - 2) {
           ands[i].a <== eq[CHUNK_NUMBER - 1].out;
           ands[i].b <== lt[CHUNK_NUMBER - 2].out;
           eqAnds[i].a <== eq[CHUNK_NUMBER - 1].out;
           eqAnds[i].b <== eq[CHUNK_NUMBER - 2].out;
           ors[i].a <== lt[CHUNK_NUMBER - 1].out;
           ors[i].b <== ands[i].out;
        } else {
           ands[i].a <== eqAnds[i + 1].out;
           ands[i].b <== lt[i].out;
           eqAnds[i].a <== eqAnds[i + 1].out;
           eqAnds[i].b <== eq[i].out;
           ors[i].a <== ors[i + 1].out;
           ors[i].b <== ands[i].out;
        }
     }
     out <== ors[0].out;
}

// leading register of b should be non-zero
template BigMod(CHUNK_SIZE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 126);
    signal input a[2 * CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];

    signal output div[CHUNK_NUMBER + 1];
    signal output mod[CHUNK_NUMBER];

    var LONG_DIV[2][150] = long_div(CHUNK_SIZE, CHUNK_NUMBER, a, b);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        div[i] <-- LONG_DIV[0][i];
        mod[i] <-- LONG_DIV[1][i];
    }
    div[CHUNK_NUMBER] <-- LONG_DIV[0][CHUNK_NUMBER];
    component div_range_checks[CHUNK_NUMBER + 1];
    for (var i = 0; i <= CHUNK_NUMBER; i++) {
        div_range_checks[i] = Num2Bits(CHUNK_SIZE);
        div_range_checks[i].in <== div[i];
    }
    component mod_range_checks[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mod_range_checks[i] = Num2Bits(CHUNK_SIZE);
        mod_range_checks[i].in <== mod[i];
    }

    component mul = BigMult(CHUNK_SIZE, CHUNK_NUMBER + 1);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mul.a[i] <== div[i];
        mul.b[i] <== b[i];
    }
    mul.a[CHUNK_NUMBER] <== div[CHUNK_NUMBER];
    mul.b[CHUNK_NUMBER] <== 0;

    for (var i = 0; i < 2 * CHUNK_NUMBER + 2; i++) {
        //log(mul.out[i]);
    }

    component add = BigAdd(CHUNK_SIZE, 2 * CHUNK_NUMBER + 2);
    for (var i = 0; i < 2 * CHUNK_NUMBER; i++) {
        add.a[i] <== mul.out[i];
        if (i < CHUNK_NUMBER) {
            add.b[i] <== mod[i];
        } else {
            add.b[i] <== 0;
        }
    }
    add.a[2 * CHUNK_NUMBER] <== mul.out[2 * CHUNK_NUMBER];
    add.a[2 * CHUNK_NUMBER + 1] <== mul.out[2 * CHUNK_NUMBER + 1];
    add.b[2 * CHUNK_NUMBER] <== 0;
    add.b[2 * CHUNK_NUMBER + 1] <== 0;

    for (var i = 0; i < 2 * CHUNK_NUMBER + 2; i++) {
        //log(add.out[i]);
    }

    for (var i = 0; i < 2 * CHUNK_NUMBER; i++) {
        add.out[i] === a[i];
    }
    add.out[2 * CHUNK_NUMBER] === 0;
    add.out[2 * CHUNK_NUMBER + 1] === 0;

    component lt = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lt.a[i] <== mod[i];
        lt.b[i] <== b[i];
    }
    lt.out === 1;
}

// copied from BigMod to allow a to have M registers and use long_div2
template BigMod2(CHUNK_SIZE, CHUNK_NUMBER, M) {
    assert(CHUNK_SIZE <= 126);
    signal input a[M];
    signal input b[CHUNK_NUMBER];

    signal output div[M - CHUNK_NUMBER + 1];
    signal output mod[CHUNK_NUMBER];

    var LONG_DIV[2][150] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, M-CHUNK_NUMBER, a, b);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mod[i] <-- LONG_DIV[1][i];
    }
    for (var i = 0; i <= M-CHUNK_NUMBER; i++) {
        div[i] <-- LONG_DIV[0][i];
    }
    component div_range_checks[M - CHUNK_NUMBER + 1];
    for (var i = 0; i <= M-CHUNK_NUMBER; i++) {
        div_range_checks[i] = Num2Bits(CHUNK_SIZE);
        div_range_checks[i].in <== div[i];
    }
    component mod_range_checks[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mod_range_checks[i] = Num2Bits(CHUNK_SIZE);
        mod_range_checks[i].in <== mod[i];
    }

    component mul = BigMult(CHUNK_SIZE, M-CHUNK_NUMBER + 1);
    // this might need to be optimized since b has less registers than div
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mul.a[i] <== div[i];
        mul.b[i] <== b[i];
    }
    for (var i = CHUNK_NUMBER; i <= M-CHUNK_NUMBER; i++) {
        mul.a[i] <== div[i];
        mul.b[i] <== 0;
    }

    // mul shouldn't have more registers than a
    for (var i = M; i < 2*(M-CHUNK_NUMBER)+2; i++) {
        mul.out[i] === 0;
    }

    component add = BigAdd(CHUNK_SIZE, M);
    for (var i = 0; i < M; i++) {
        add.a[i] <== mul.out[i];
        if (i < CHUNK_NUMBER) {
            add.b[i] <== mod[i];
        } else {
            add.b[i] <== 0;
        }
    }

    for (var i = 0; i < M; i++) {
        add.out[i] === a[i];
    }
    add.out[M] === 0;

    component lt = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lt.a[i] <== mod[i];
        lt.b[i] <== b[i];
    }
    lt.out === 1;
}



// a[i], b[i] in 0... 2**CHUNK_SIZE-1
// represent a = a[0] + a[1] * 2**CHUNK_SIZE + .. + a[CHUNK_NUMBER - 1] * 2**(CHUNK_SIZE * CHUNK_NUMBER)
// calculates (a+b)%P, where 0<= a,b < P 
template BigAddModP(CHUNK_SIZE, CHUNK_NUMBER){
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];

    component add = BigAdd(CHUNK_SIZE,CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        add.a[i] <== a[i];
        add.b[i] <== b[i];
    }
    component lt = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER+1);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lt.a[i] <== add.out[i];
        lt.b[i] <== p[i];
    }
    lt.a[CHUNK_NUMBER] <== add.out[CHUNK_NUMBER];
    lt.b[CHUNK_NUMBER] <== 0; 

    component sub = BigSub(CHUNK_SIZE,CHUNK_NUMBER+1);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        sub.a[i] <== add.out[i];
        sub.b[i] <== (1-lt.out) * p[i];
    }
    sub.a[CHUNK_NUMBER] <== add.out[CHUNK_NUMBER];
    sub.b[CHUNK_NUMBER] <== 0;
    
    sub.out[CHUNK_NUMBER] === 0;
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[i] <== sub.out[i];
    }
}

/*
Inputs:
    - BigInts a, b
    - Assume a >= b
Output:
    - BigInt out = a - b
    - underflow = how much is borrowed at the highest digit of subtraction, only nonzero if a < b
*/
template BigSub(CHUNK_SIZE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    signal output underflow;

    component unit0 = ModSub(CHUNK_SIZE);
    unit0.a <== a[0];
    unit0.b <== b[0];
    out[0] <== unit0.out;

    component unit[CHUNK_NUMBER - 1];
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        unit[i - 1] = ModSubThree(CHUNK_SIZE);
        unit[i - 1].a <== a[i];
        unit[i - 1].b <== b[i];
        if (i == 1) {
            unit[i - 1].c <== unit0.borrow;
        } else {
            unit[i - 1].c <== unit[i - 2].borrow;
        }
        out[i] <== unit[i - 1].out;
    }
    underflow <== unit[CHUNK_NUMBER - 2].borrow;
}

// calculates (a - b) % p, where a, b < p
// note: does not assume a >= b
template BigSubModP(CHUNK_SIZE, CHUNK_NUMBER){
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
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

// Note: deprecated
template BigMultModP(CHUNK_SIZE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 252);
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];

    component big_mult = BigMultOptimised(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        big_mult.in[0][i] <== a[i];
        big_mult.in[1][i] <== b[i];
    }
    big_mult.dummy <== 0;

    component big_mod = BigMod(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < 2 * CHUNK_NUMBER; i++) {
        big_mod.a[i] <== big_mult.out[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        big_mod.b[i] <== p[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[i] <== big_mod.mod[i];
    }
}

template BigModInv(CHUNK_SIZE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 252);
    signal input in[CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];

    // length CHUNK_NUMBER
    var inv[150] = mod_inv(CHUNK_SIZE, CHUNK_NUMBER, in, p);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[i] <-- inv[i];
    }
    component rangeChecks[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        rangeChecks[i] = Num2Bits(CHUNK_SIZE);
        rangeChecks[i].in <== out[i];
    }

    component mult = BigMult(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mult.a[i] <== in[i];
        mult.b[i] <== out[i];
    }
    component mod = BigMod(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < 2 * CHUNK_NUMBER; i++) {
        mod.a[i] <== mult.out[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        mod.b[i] <== p[i];
    }
    mod.mod[0] === 1;
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        mod.mod[i] === 0;
    }
}

/* Taken from circom-ecdsa
Input: 
    - in = in[0] + in[1] * X + ... + in[CHUNK_NUMBER-1] * X^{CHUNK_NUMBER-1} as signed overflow representation
    - Assume each in[i] is in range (-2^{M-1}, 2^{M-1})
Implements:
    - constrain that in[] evaluated at X = 2^CHUNK_SIZE as a big integer equals zero
*/
template CheckCarryToZero(CHUNK_SIZE, M, CHUNK_NUMBER) {
    assert(CHUNK_NUMBER >= 2);
    
    var EPSILON = 1; // see below for why 1 is ok
    
    signal input in[CHUNK_NUMBER];
    
    signal carry[CHUNK_NUMBER];
    component carryRangeChecks[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER-1; i++){
        carryRangeChecks[i] = Num2Bits(M + EPSILON - CHUNK_SIZE); 
        if( i == 0 ){
            carry[i] <-- in[i] / (1<<CHUNK_SIZE);
            in[i] === carry[i] * (1<<CHUNK_SIZE);
        }
        else{
            carry[i] <-- (in[i]+carry[i-1]) / (1<<CHUNK_SIZE);
            in[i] + carry[i-1] === carry[i] * (1<<CHUNK_SIZE);
        }
        // checking carry is in the range of -2^(M-CHUNK_SIZE-1+eps), 2^(M-CHUNK_SIZE-1+eps)
        carryRangeChecks[i].in <== carry[i] + ( 1<< (M + EPSILON - CHUNK_SIZE - 1));
        // carry[i] is bounded by 2^{M-1} * (2^{-CHUNK_SIZE} + 2^{-2n} + ... ) = 2^{M-CHUNK_SIZE-1} * ( 1/ (1-2^{-CHUNK_SIZE})) < 2^{M-CHUNK_SIZE} by geometric series 
    }
    
    in[CHUNK_NUMBER-1] + carry[CHUNK_NUMBER-2] === 0;
    
}

/* 
Let X = 2^CHUNK_SIZE 
Input:
    - in is length CHUNK_NUMBER + M array in signed overflow representation
    - in = in[0] + in[1] * X + ... + in[CHUNK_NUMBER+M-1] * X^{CHUNK_NUMBER+M-1}
    - Assume each in[i] is a signed integer such that abs(in[i] * 2^CHUNK_SIZE) < 2^252
    - P is prime in BigInt format passed as parameter
Output:
    - out = out[0] + out[1] * X + ... + out[CHUNK_NUMBER-1] * X^{CHUNK_NUMBER-1} is BigInt congruent to in (mod P)
Implementation:
    - For i >= CHUNK_NUMBER, we precompute X^i = r[i] mod P, where r[i] represented as CHUNK_NUMBER registers with r[i][j] in [0, 2^CHUNK_SIZE) 
    - in[i] * X^i is replaced by sum_j in[i] * r[i][j] * X^j
Notes:
    - If each in[i] has absolute value <B, then out[i] has absolute value < (M+1) * 2^CHUNK_SIZE * B
M_OUT is the expected max number of bits in the output registers
*/
template PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, M, P, M_OUT){
    signal input in[M+CHUNK_NUMBER]; 
    signal output out[CHUNK_NUMBER];

    var TWO[CHUNK_NUMBER]; 
    var E[CHUNK_NUMBER];
    for(var i=1; i<CHUNK_NUMBER; i++){
        TWO[i]=0;
        E[i]=0;
    }
    TWO[0] = 2;

    
    E[0] = CHUNK_SIZE;
    var POW_2_N[150] = mod_exp(CHUNK_SIZE, CHUNK_NUMBER, TWO, P, E); 
    E[0] = CHUNK_NUMBER;
    assert(CHUNK_NUMBER < (1<<CHUNK_SIZE) );
    var pow2nk[150] = mod_exp(CHUNK_SIZE, CHUNK_NUMBER, POW_2_N, P, E);
    
    var r[M][150]; 
    for(var i=0; i<M; i++){
        // r[i] = 2^{CHUNK_SIZE(CHUNK_NUMBER+i)} mod P 
        if(i==0){
            r[i] = pow2nk;
        }else{
            r[i] = prod_mod(CHUNK_SIZE, CHUNK_NUMBER, r[i-1], POW_2_N, P);  
        }
    } 
    var out_sum[CHUNK_NUMBER]; 
    for(var i=0; i<CHUNK_NUMBER; i++)
        out_sum[i] = in[i];
    for(var i=0; i<M; i++)
        for(var j=0; j<CHUNK_NUMBER; j++)
            out_sum[j] += in[i+CHUNK_NUMBER] * r[i][j]; // linear constraint 
    for(var i=0; i<CHUNK_NUMBER; i++)
        out[i] <== out_sum[i]; 
    /*component rangeChecks[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        rangeChecks[i] = Num2Bits(M_OUT+1);
        rangeChecks[i].in <== out[i] + (1 << M_OUT);
    }*/
}

/* 
Polynomial multiplication in 2 variables
Input:
    - a = sum_{i=0}^{l-1} sum_{j=0}^{CHUNK_NUMBER-1} a[i][j] * w^i * X^j 
    - b = sum_{i=0}^{l-1} sum_{j=0}^{CHUNK_NUMBER-1} b[i][j] * w^i * X^j 
Output:
    - out = sum_{i=0}^{2*l-2} sum_{j=0}^{2*CHUNK_NUMBER-1} out[i][j] * w^i * X^j 
    - out = a * b as product of polynomials in TWO variables w, X 
Notes:
    - Uses same xJsnark optimization as BigMultShortLong
    - If a[i][j], b[i][j] have absolute value < B, then out[i][j] has absolute value < l * CHUNK_NUMBER * B^2 
Use case: one variable will end up being 2^CHUNK_SIZE; the other will be the field extension generator
*/
template BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, l) {
    signal input a[l][CHUNK_NUMBER];
    signal input b[l][CHUNK_NUMBER];
    signal output out[2*l-1][2*CHUNK_NUMBER-1];

    var PROD_VAL[2*l-1][2*CHUNK_NUMBER-1];
    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*CHUNK_NUMBER-1; j++) {
            PROD_VAL[i][j] = 0;
        }
    }

    for (var i1 = 0; i1 < l; i1 ++) {
        for (var i2 = 0; i2 < l; i2 ++) {
            for (var j1 = 0; j1 < CHUNK_NUMBER; j1 ++) {
                for (var j2 = 0; j2 < CHUNK_NUMBER; j2 ++) {
                    var i = i1 + i2;
                    var j = j1 + j2;
                    PROD_VAL[i][j] += a[i1][j1] * b[i2][j2];
                }
            }
        }
    }

    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*CHUNK_NUMBER-1; j++) {
            out[i][j] <-- PROD_VAL[i][j];
        }
    }
    
    var k2 = (2*CHUNK_NUMBER-1 > 2*l-1) ? 2*CHUNK_NUMBER-1 : 2*l-1;
    var pow[k2][k2]; 
    for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
        pow[i][j] = i ** j; 

    var aPoly[2*l-1][2*CHUNK_NUMBER-1];
    var bPoly[2*l-1][2*CHUNK_NUMBER-1];
    var outPoly[2*l-1][2*CHUNK_NUMBER-1];
    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*CHUNK_NUMBER-1; j++) {
            aPoly[i][j] = 0;
            bPoly[i][j] = 0;
            outPoly[i][j] = 0;
            for (var deg1 = 0; deg1 < l; deg1 ++) {
                for (var deg2 = 0; deg2 < CHUNK_NUMBER; deg2 ++) {
                    aPoly[i][j] = aPoly[i][j] + a[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                    bPoly[i][j] = bPoly[i][j] + b[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                }
            }
            for (var deg1 = 0; deg1 < 2*l-1; deg1 ++) {
                for (var deg2 = 0; deg2 < 2*CHUNK_NUMBER-1; deg2 ++) {
                    outPoly[i][j] = outPoly[i][j] + out[deg1][deg2] * pow[i][deg1] * pow[j][deg2];// (i ** deg1) * (j ** deg2);
                }
            }
        }
    }
    
    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*CHUNK_NUMBER-1; j++) {
            outPoly[i][j] === aPoly[i][j] * bPoly[i][j];
        }
    }
}

/* 
Same as BigMultShortLong2D except a has degrees L_A - 1, K_A - 1 and b has degrees L_B - 1, K_B - 1
Notes:
    - If a[i][j], b[i][j] have absolute value < B, then out[i][j] has absolute value < min(L_A, L_B) * min(K_A, K_B) * B^2 
*/
template BigMultShortLong2DUnequal(CHUNK_SIZE, K_A, K_B, L_A, L_B) {
    signal input a[L_A][K_A];
    signal input b[L_B][K_B];
    signal output out[L_A + L_B -1][K_A + K_B -1];

    var PROD_VAL[L_A + L_B -1][K_A + K_B -1];
    for (var i = 0; i < L_A + L_B -1; i++) {
        for (var j = 0; j < K_A + K_B -1; j++) {
            PROD_VAL[i][j] = 0;
        }
    }

    for (var i1 = 0; i1 < L_A; i1 ++) {
        for (var i2 = 0; i2 < L_B; i2 ++) {
            for (var j1 = 0; j1 < K_A; j1 ++) {
                for (var j2 = 0; j2 < K_B; j2 ++) {
                    var i = i1 + i2;
                    var j = j1 + j2;
                    PROD_VAL[i][j] += a[i1][j1] * b[i2][j2];
                }
            }
        }
    }

    for (var i = 0; i < L_A + L_B -1; i++) {
        for (var j = 0; j < K_A + K_B -1; j++) {
            out[i][j] <-- PROD_VAL[i][j];
        }
    }

    var k2 = (K_A + K_B -1 > L_A + L_B -1) ? K_A + K_B - 1 : L_A + L_B -1;
    var pow[k2][k2]; 
    for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
        pow[i][j] = i ** j; 

    var aPoly[L_A + L_B - 1][K_A + K_B -1];
    var bPoly[L_A + L_B - 1][K_A + K_B -1];
    var outPoly[L_A + L_B - 1][K_A + K_B -1];
    for (var i = 0; i < L_A + L_B - 1; i++) {
        for (var j = 0; j < K_A + K_B - 1; j++) {
            aPoly[i][j] = 0;
            bPoly[i][j] = 0;
            outPoly[i][j] = 0;
            for (var deg1 = 0; deg1 < L_A + L_B - 1; deg1 ++) {
                if (deg1 < L_A) {
                    for (var deg2 = 0; deg2 < K_A; deg2 ++) {
                        aPoly[i][j] = aPoly[i][j] + a[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; //(i ** deg1) * (j ** deg2);
                    }
                }
                if (deg1 < L_B) {
                    for (var deg2 = 0; deg2 < K_B; deg2 ++) {
                        bPoly[i][j] = bPoly[i][j] + b[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                    }
		        }
                for (var deg2 = 0; deg2 < K_A + K_B -1; deg2 ++) {
                    outPoly[i][j] = outPoly[i][j] + out[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                }
            }
        }
    }

    for (var i = 0; i < L_A + L_B - 1; i++) {
        for (var j = 0; j < K_A + K_B - 1; j++) {
            outPoly[i][j] === aPoly[i][j] * bPoly[i][j];
        }
    }
}

