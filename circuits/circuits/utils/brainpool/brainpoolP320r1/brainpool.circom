pragma circom 2.1.6;

include "../brainpoolP256r1/circomPairing/curve.circom";
include "./brainpoolFunc.circom";
include "./brainpoolPows.circom";
include "circomlib/circuits/multiplexer.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "../utils/func.circom";

template Brainpool320ScalarMult(CHUNK_SIZE, CHUNK_NUMBER){
    signal input scalar[CHUNK_NUMBER];
    signal input point[2][CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    component n2b[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        n2b[i] = Num2Bits(CHUNK_SIZE);
        n2b[i].in <== scalar[i];
    }

    // hasPrevNonZero[CHUNK_SIZE * i + j] == 1 if there is a nonzero bit in location [i][j] or higher order bit
    component hasPrevNonZero[CHUNK_NUMBER * CHUNK_SIZE];
    for (var i = CHUNK_NUMBER - 1; i >= 0; i--) {
        for (var j = CHUNK_SIZE - 1; j >= 0; j--) {
            hasPrevNonZero[CHUNK_SIZE * i + j] = OR();
            if (i == CHUNK_NUMBER - 1 && j == CHUNK_SIZE - 1) {
                hasPrevNonZero[CHUNK_SIZE * i + j].a <== 0;
                hasPrevNonZero[CHUNK_SIZE * i + j].b <== n2b[i].out[j];
            } else {
                hasPrevNonZero[CHUNK_SIZE * i + j].a <== hasPrevNonZero[CHUNK_SIZE * i + j + 1].out;
                hasPrevNonZero[CHUNK_SIZE * i + j].b <== n2b[i].out[j];
            }
        }
    }

    signal partial[CHUNK_SIZE * CHUNK_NUMBER][2][CHUNK_NUMBER];
    signal intermed[CHUNK_SIZE * CHUNK_NUMBER - 1][2][CHUNK_NUMBER];
    component adders[CHUNK_SIZE * CHUNK_NUMBER - 1];
    component doublers[CHUNK_SIZE * CHUNK_NUMBER - 1];
    for (var i = CHUNK_NUMBER - 1; i >= 0; i--) {
        for (var j = CHUNK_SIZE - 1; j >= 0; j--) {
            if (i == CHUNK_NUMBER - 1 && j == CHUNK_SIZE - 1) {
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    partial[CHUNK_SIZE * i + j][0][idx] <== point[0][idx];
                    partial[CHUNK_SIZE * i + j][1][idx] <== point[1][idx];
                }
            }
            if (i < CHUNK_NUMBER - 1 || j < CHUNK_SIZE - 1) {
                adders[CHUNK_SIZE * i + j] = Brainpool320AddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
                doublers[CHUNK_SIZE * i + j] = Brainpool320Double(CHUNK_SIZE, CHUNK_NUMBER);
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    doublers[CHUNK_SIZE * i + j].in[0][idx] <== partial[CHUNK_SIZE * i + j + 1][0][idx];
                    doublers[CHUNK_SIZE * i + j].in[1][idx] <== partial[CHUNK_SIZE * i + j + 1][1][idx];
                }
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    adders[CHUNK_SIZE * i + j].point1[0][idx] <== doublers[CHUNK_SIZE * i + j].out[0][idx];
                    adders[CHUNK_SIZE * i + j].point1[1][idx] <== doublers[CHUNK_SIZE * i + j].out[1][idx];
                    adders[CHUNK_SIZE * i + j].point2[0][idx] <== point[0][idx];
                    adders[CHUNK_SIZE * i + j].point2[1][idx] <== point[1][idx];
                }
                // partial[CHUNK_SIZE * i + j]
                // = hasPrevNonZero[CHUNK_SIZE * i + j + 1] * ((1 - n2b[i].out[j]) * doublers[CHUNK_SIZE * i + j] + n2b[i].out[j] * adders[CHUNK_SIZE * i + j])
                //   + (1 - hasPrevNonZero[CHUNK_SIZE * i + j + 1]) * point
                for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                    intermed[CHUNK_SIZE * i + j][0][idx] <== n2b[i].out[j] * (adders[CHUNK_SIZE * i + j].out[0][idx] - doublers[CHUNK_SIZE * i + j].out[0][idx]) + doublers[CHUNK_SIZE * i + j].out[0][idx];
                    intermed[CHUNK_SIZE * i + j][1][idx] <== n2b[i].out[j] * (adders[CHUNK_SIZE * i + j].out[1][idx] - doublers[CHUNK_SIZE * i + j].out[1][idx]) + doublers[CHUNK_SIZE * i + j].out[1][idx];
                    partial[CHUNK_SIZE * i + j][0][idx] <== hasPrevNonZero[CHUNK_SIZE * i + j + 1].out * (intermed[CHUNK_SIZE * i + j][0][idx] - point[0][idx]) + point[0][idx];
                    partial[CHUNK_SIZE * i + j][1][idx] <== hasPrevNonZero[CHUNK_SIZE * i + j + 1].out * (intermed[CHUNK_SIZE * i + j][1][idx] - point[1][idx]) + point[1][idx];
                }
            }
        }
    }

    for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
        out[0][idx] <== partial[0][0][idx];
        out[1][idx] <== partial[0][1][idx];
    }
}

template Brainpool320AddUnequal(CHUNK_SIZE, CHUNK_NUMBER){
    signal input point1[2][CHUNK_NUMBER];
    signal input point2[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var PARAMS[3][CHUNK_NUMBER] = get_320_params(CHUNK_SIZE,CHUNK_NUMBER);

    component add = EllipticCurveAddUnequal(CHUNK_SIZE, CHUNK_NUMBER, PARAMS[2]);   
    add.a <== point1;
    add.b <== point2;
    add.out ==> out;
}

template Brainpool320Double(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var PARAMS[3][CHUNK_NUMBER] = get_320_params(CHUNK_SIZE,CHUNK_NUMBER);

    component doubling = EllipticCurveDouble(CHUNK_SIZE,CHUNK_NUMBER, PARAMS[0], PARAMS[1], PARAMS[2]);
    doubling.in <== in;
    doubling.out ==> out;
}

template Brainpool320GetGenerator(CHUNK_SIZE, CHUNK_NUMBER){

    assert((CHUNK_SIZE == 32 && CHUNK_NUMBER == 10) || (CHUNK_SIZE == 40 && CHUNK_NUMBER == 8) || (CHUNK_SIZE == 16 && CHUNK_NUMBER == 20));


    signal output gen[2][CHUNK_NUMBER];

    if ((CHUNK_SIZE == 32) && (CHUNK_NUMBER == 10)){
        gen[0][0] <== 971114001;
        gen[0][1] <== 279940365;
        gen[0][2] <== 279288263;
        gen[0][3] <== 3884391978;
        gen[0][4] <== 168328886;
        gen[0][5] <== 4060166097;
        gen[0][6] <== 2397421542;
        gen[0][7] <== 1384758468;
        gen[0][8] <== 4216576184;
        gen[0][9] <== 1136492186;
        gen[1][0] <== 1764658913;
        gen[1][1] <== 3545384401;
        gen[1][2] <== 2863426247;
        gen[1][3] <== 2848422007;
        gen[1][4] <== 292651754;
        gen[1][5] <== 121896941;
        gen[1][6] <== 2138515294;
        gen[1][7] <== 2873135908;
        gen[1][8] <== 1173101768;
        gen[1][9] <== 352178261;
    } 
    if ((CHUNK_SIZE == 40) && (CHUNK_NUMBER == 8)){
        gen[0][0] <== 56805688849;
        gen[0][1] <== 660469755789;
        gen[0][2] <== 580326658213;
        gen[0][3] <== 43092195047;
        gen[0][4] <== 991902644177;
        gen[0][5] <== 810751550911;
        gen[0][6] <== 360118243977;
        gen[0][7] <== 290941999867;
        gen[1][0] <== 899412823777;
        gen[1][1] <== 458619048517;
        gen[1][2] <== 856719600300;
        gen[1][3] <== 74918849193;
        gen[1][4] <== 403848822765;
        gen[1][5] <== 631972525863;
        gen[1][6] <== 1014095194944;
        gen[1][7] <== 90157634885;
    }
    if ((CHUNK_SIZE == 16) && (CHUNK_NUMBER == 20)){
        gen[0][0] <== 1553;
        gen[0][1] <== 14818;
        gen[0][2] <== 36109;
        gen[0][3] <== 4271;
        gen[0][4] <== 39367;
        gen[0][5] <== 4261;
        gen[0][6] <== 7722;
        gen[0][7] <== 59271;
        gen[0][8] <== 32438;
        gen[0][9] <== 2568;
        gen[0][10] <== 14289;
        gen[0][11] <== 61953;
        gen[0][12] <== 49126;
        gen[0][13] <== 36581;
        gen[0][14] <== 48324;
        gen[0][15] <== 21129;
        gen[0][16] <== 55480;
        gen[0][17] <== 64339;
        gen[0][18] <== 32410;
        gen[0][19] <== 17341;
        gen[1][0] <== 36577;
        gen[1][1] <== 26926;
        gen[1][2] <== 17873;
        gen[1][3] <== 54098;
        gen[1][4] <== 27335;
        gen[1][5] <== 43692;
        gen[1][6] <== 30839;
        gen[1][7] <== 43463;
        gen[1][8] <== 33514;
        gen[1][9] <== 4465;
        gen[1][10] <== 65517;
        gen[1][11] <== 1859;
        gen[1][12] <== 10078;
        gen[1][13] <== 32631;
        gen[1][14] <== 37668;
        gen[1][15] <== 43840;
        gen[1][16] <== 7368;
        gen[1][17] <== 17900;
        gen[1][18] <== 53333;
        gen[1][19] <== 5373;
    }
   
    
}

template GetBrainpool320Order(CHUNK_SIZE, CHUNK_NUMBER){

    assert((CHUNK_SIZE == 32 && CHUNK_NUMBER == 10) || (CHUNK_SIZE == 40 && CHUNK_NUMBER == 8) || (CHUNK_SIZE == 16 && CHUNK_NUMBER == 20));

    signal output order[CHUNK_NUMBER];
    if ((CHUNK_SIZE == 32) && (CHUNK_NUMBER == 10)){
        order[0] <== 1153798929;
        order[1] <== 2257671515;
        order[2] <== 4001781993;
        order[3] <== 759705287;
        order[4] <== 3062829731;
        order[5] <== 4186951589;
        order[6] <== 3523338341;
        order[7] <== 3778836574;
        order[8] <== 918310839;
        order[9] <== 3546171168;
    }
    if ((CHUNK_SIZE == 40) && (CHUNK_NUMBER == 8)){
        order[0] <== 391995822865;
        order[1] <== 381875032405;
        order[2] <== 310022499974;
        order[3] <== 784084411181;
        order[4] <== 437978648485;
        order[5] <== 516986896864;
        order[6] <== 808791302460;
        order[7] <== 907819819062;
    }
    if (CHUNK_SIZE == 16 && CHUNK_NUMBER == 20){
        order[0] <== 37649;
        order[1] <== 17605;
        order[2] <== 21851;
        order[3] <== 34449;
        order[4] <== 22761;
        order[5] <== 61062;
        order[6] <== 11975;
        order[7] <== 11592;
        order[8] <== 4771;
        order[9] <== 46735;
        order[10] <== 53157;
        order[11] <== 63887;
        order[12] <== 57445;
        order[13] <== 53761;
        order[14] <== 30814;
        order[15] <== 57660;
        order[16] <== 20407;
        order[17] <== 14012;
        order[18] <== 18208;
        order[19] <== 54110;
    }
}

template Brainpool320GeneratorMultiplication(CHUNK_SIZE, CHUNK_NUMBER){
    var STRIDE = 8;
    signal input scalar[CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    component n2b[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        n2b[i] = Num2Bits(CHUNK_SIZE);
        n2b[i].in <== scalar[i];
    }

    var NUM_STRIDES = div_ceil(CHUNK_SIZE * CHUNK_NUMBER, STRIDE);
    // power[i][j] contains: [j * (1 << STRIDE * i) * G] for 1 <= j < (1 << STRIDE)
    var POWERS[NUM_STRIDES][2 ** STRIDE][2][CHUNK_NUMBER];
    POWERS = get_g_pow_stride8_table_brainpool320(CHUNK_SIZE, CHUNK_NUMBER);

    var DUMMY_HOLDER[2][CHUNK_NUMBER] = get_320_dummy_point(CHUNK_SIZE, CHUNK_NUMBER);
    var DUMMY[2][CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) DUMMY[0][i] = DUMMY_HOLDER[0][i];
    for (var i = 0; i < CHUNK_NUMBER; i++) DUMMY[1][i] = DUMMY_HOLDER[1][i];

    component selectors[NUM_STRIDES];
    for (var i = 0; i < NUM_STRIDES; i++) {
        selectors[i] = Bits2Num(STRIDE);
        for (var j = 0; j < STRIDE; j++) {
            var bit_idx1 = (i * STRIDE + j) \ CHUNK_SIZE;
            var bit_idx2 = (i * STRIDE + j) % CHUNK_SIZE;
            if (bit_idx1 < CHUNK_NUMBER) {
                selectors[i].in[j] <== n2b[bit_idx1].out[bit_idx2];
            } else {
                selectors[i].in[j] <== 0;
            }
        }
    }

    // multiplexers[i][l].out will be the coordinates of:
    // selectors[i].out * (2 ** (i * STRIDE)) * G    if selectors[i].out is non-zero
    // (2 ** 255) * G                                if selectors[i].out is zero
    component multiplexers[NUM_STRIDES][2];
    // select from CHUNK_NUMBER-register outputs using a 2 ** STRIDE bit selector
    for (var i = 0; i < NUM_STRIDES; i++) {
        for (var l = 0; l < 2; l++) {
            multiplexers[i][l] = Multiplexer(CHUNK_NUMBER, (1 << STRIDE));
            multiplexers[i][l].sel <== selectors[i].out;
            for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                multiplexers[i][l].inp[0][idx] <== DUMMY[l][idx];
                for (var j = 1; j < (1 << STRIDE); j++) {
                    multiplexers[i][l].inp[j][idx] <== POWERS[i][j][l][idx];
                }
            }
        }
    }

    component isZero[NUM_STRIDES];
    for (var i = 0; i < NUM_STRIDES; i++) {
        isZero[i] = IsZero();
        isZero[i].in <== selectors[i].out;
    }

    // hasPrevNonZero[i] = 1 if at least one of the selections in privkey up to STRIDE i is non-zero
    component hasPrevNonZero[NUM_STRIDES];
    hasPrevNonZero[0] = OR();
    hasPrevNonZero[0].a <== 0;
    hasPrevNonZero[0].b <== 1 - isZero[0].out;
    for (var i = 1; i < NUM_STRIDES; i++) {
        hasPrevNonZero[i] = OR();
        hasPrevNonZero[i].a <== hasPrevNonZero[i - 1].out;
        hasPrevNonZero[i].b <== 1 - isZero[i].out;
    }

    signal partial[NUM_STRIDES][2][CHUNK_NUMBER];
    for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
        for (var l = 0; l < 2; l++) {
            partial[0][l][idx] <== multiplexers[0][l].out[idx];
        }
    }

    component adders[NUM_STRIDES - 1];
    signal intermed1[NUM_STRIDES - 1][2][CHUNK_NUMBER];
    signal intermed2[NUM_STRIDES - 1][2][CHUNK_NUMBER];
    for (var i = 1; i < NUM_STRIDES; i++) {
        adders[i - 1] = Brainpool320AddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
        for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
            for (var l = 0; l < 2; l++) {
                adders[i - 1].point1[l][idx] <== partial[i - 1][l][idx];
                adders[i - 1].point2[l][idx] <== multiplexers[i][l].out[idx];
            }
        }

        // partial[i] = hasPrevNonZero[i - 1] * ((1 - isZero[i]) * adders[i - 1].out + isZero[i] * partial[i - 1][0][idx])
        //              + (1 - hasPrevNonZero[i - 1]) * (1 - isZero[i]) * multiplexers[i]
        for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
            for (var l = 0; l < 2; l++) {
                intermed1[i - 1][l][idx] <== isZero[i].out * (partial[i - 1][l][idx] - adders[i - 1].out[l][idx]) + adders[i - 1].out[l][idx];
                intermed2[i - 1][l][idx] <== multiplexers[i][l].out[idx] - isZero[i].out * multiplexers[i][l].out[idx];
                partial[i][l][idx] <== hasPrevNonZero[i - 1].out * (intermed1[i - 1][l][idx] - intermed2[i - 1][l][idx]) + intermed2[i - 1][l][idx];
            }
        }
    }

    for (var i = 0; i < CHUNK_NUMBER; i++) {
        for (var l = 0; l < 2; l++) {
            out[l][i] <== partial[NUM_STRIDES - 1][l][i];
        }
    }
}

template Brainpool320PrecomputePipinger(CHUNK_SIZE, CHUNK_NUMBER, WINDOW_SIZE){
    signal input in[2][CHUNK_NUMBER];

    var PRECOMPUTE_NUMBER = 2 ** WINDOW_SIZE; 

    signal output out[PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];
    
    for (var i = 0; i < 2; i++){
        for (var j = 0; j < CHUNK_NUMBER; j++){
            out[0][i][j] <== 0;
        }
    }

    out[1] <== in;

    component doublers[PRECOMPUTE_NUMBER\2 - 1];
    component adders  [PRECOMPUTE_NUMBER\2 - 1];

    for (var i = 2; i < PRECOMPUTE_NUMBER; i++){
        if (i % 2 == 0){
            doublers[i\2 - 1]     = Brainpool320Double(CHUNK_SIZE, CHUNK_NUMBER);
            doublers[i\2 - 1].in  <== out[i\2];
            doublers[i\2 - 1].out ==> out[i];
        }
        else
        {
            adders[i\2 - 1]          = Brainpool320AddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
            adders[i\2 - 1].point1   <== out[1];
            adders[i\2 - 1].point2   <== out[i - 1];
            adders[i\2 - 1].out      ==> out[i]; 
        }
    }
}

template Brainpool320PipingerMult(CHUNK_SIZE, CHUNK_NUMBER, WINDOW_SIZE){

    assert(WINDOW_SIZE == 4);

    signal input  point[2][CHUNK_NUMBER];
    signal input  scalar  [CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    var PRECOMPUTE_NUMBER = 2 ** WINDOW_SIZE;

    signal precomputed[PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];

    component precompute = Brainpool320PrecomputePipinger(CHUNK_SIZE, CHUNK_NUMBER, WINDOW_SIZE);
    precompute.in  <== point;
    precompute.out ==> precomputed;

    var DOUBLERS_NUMBER = CHUNK_SIZE*CHUNK_NUMBER - WINDOW_SIZE;
    var ADDERS_NUMBER   = CHUNK_SIZE*CHUNK_NUMBER \ WINDOW_SIZE; //80

    component doublers[DOUBLERS_NUMBER];
    component adders  [ADDERS_NUMBER];
    component bits2Num[ADDERS_NUMBER];
    component num2Bits[CHUNK_NUMBER];

    signal res [ADDERS_NUMBER + 1][2][CHUNK_NUMBER];

    signal tmp [ADDERS_NUMBER][PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];

    signal tmp2[ADDERS_NUMBER]    [2]   [CHUNK_NUMBER];
    signal tmp3[ADDERS_NUMBER]    [2][2][CHUNK_NUMBER];
    signal tmp4[ADDERS_NUMBER]    [2]   [CHUNK_NUMBER];
    signal tmp5[ADDERS_NUMBER]    [2][2][CHUNK_NUMBER];
    signal tmp6[ADDERS_NUMBER - 1][2][2][CHUNK_NUMBER];
    signal tmp7[ADDERS_NUMBER - 1][2]   [CHUNK_NUMBER]; //79
    
    component equals    [ADDERS_NUMBER][PRECOMPUTE_NUMBER][2][CHUNK_NUMBER];
    component zeroEquals[ADDERS_NUMBER];
    component tmpEquals [ADDERS_NUMBER];

    component g = Brainpool320GetGenerator(CHUNK_SIZE, CHUNK_NUMBER);
    signal gen[2][CHUNK_NUMBER];
    gen <== g.gen;

    signal scalarBits[CHUNK_NUMBER*CHUNK_SIZE];

    for (var i = 0; i < CHUNK_NUMBER; i++){
        num2Bits[i] = Num2Bits(CHUNK_SIZE);
        num2Bits[i].in <== scalar[i];
       
        for (var j = 0; j < CHUNK_SIZE; j++){
            scalarBits[CHUNK_NUMBER*CHUNK_SIZE - CHUNK_SIZE * (i + 1) + j] <== num2Bits[i].out[CHUNK_SIZE - 1 - j];
        }
    }

    res[0] <== precomputed[0];

    for (var i = 0; i < CHUNK_NUMBER*CHUNK_SIZE; i += WINDOW_SIZE){
        adders[i\WINDOW_SIZE] = Brainpool320AddUnequal(CHUNK_SIZE, CHUNK_NUMBER);
        bits2Num[i\WINDOW_SIZE] = Bits2Num(WINDOW_SIZE);
        for (var j = 0; j < WINDOW_SIZE; j++){
            bits2Num[i\WINDOW_SIZE].in[j] <== scalarBits[i + (WINDOW_SIZE - 1) - j];
        }

        tmpEquals[i\WINDOW_SIZE] = IsEqual();
        tmpEquals[i\WINDOW_SIZE].in[0] <== 0;
        tmpEquals[i\WINDOW_SIZE].in[1] <== res[i\WINDOW_SIZE][0][0];

        if (i != 0){
            for (var j = 0; j < WINDOW_SIZE; j++){
                doublers[i + j - WINDOW_SIZE] = Brainpool320Double(CHUNK_SIZE, CHUNK_NUMBER);

                if (j == 0){
                    for (var axis_idx = 0; axis_idx < 2; axis_idx++){
                        for (var coor_idx = 0; coor_idx < CHUNK_NUMBER; coor_idx ++){
                            tmp6[i\WINDOW_SIZE - 1][0][axis_idx][coor_idx] <==      tmpEquals[i\WINDOW_SIZE].out  * gen[axis_idx][coor_idx];
                            tmp6[i\WINDOW_SIZE - 1][1][axis_idx][coor_idx] <== (1 - tmpEquals[i\WINDOW_SIZE].out) * res[i\WINDOW_SIZE][axis_idx][coor_idx];
                            tmp7[i\WINDOW_SIZE - 1]   [axis_idx][coor_idx] <== tmp6[i\WINDOW_SIZE - 1][0][axis_idx][coor_idx] 
                                                                             + tmp6[i\WINDOW_SIZE - 1][1][axis_idx][coor_idx];
                        }
                    }

                    doublers[i + j - WINDOW_SIZE].in <== tmp7[i\WINDOW_SIZE - 1];
                }
                else
                {
                    doublers[i + j - WINDOW_SIZE].in <== doublers[i + j - 1 - WINDOW_SIZE].out;
                }
            }
        }

       for (var point_idx = 0; point_idx < PRECOMPUTE_NUMBER; point_idx++){
            for (var axis_idx = 0; axis_idx < 2; axis_idx++){
                for (var coor_idx = 0; coor_idx < CHUNK_NUMBER; coor_idx++){
                    equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx]       = IsEqual();
                    equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx].in[0] <== point_idx;
                    equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx].in[1] <== bits2Num[i\WINDOW_SIZE].out;
                    tmp   [i\WINDOW_SIZE][point_idx][axis_idx][coor_idx]       <== precomputed[point_idx][axis_idx][coor_idx] * 
                                                                         equals[i\WINDOW_SIZE][point_idx][axis_idx][coor_idx].out;
                }
            }
        }

        for (var axis_idx = 0; axis_idx < 2; axis_idx++){
            for (var coor_idx = 0; coor_idx < CHUNK_NUMBER; coor_idx++){
                tmp2[i\WINDOW_SIZE]   [axis_idx][coor_idx] <== 
                tmp[i\WINDOW_SIZE][0] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][1] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][2] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][3] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][4] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][5] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][6] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][7] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][8] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][9] [axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][10][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][11][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][12][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][13][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][14][axis_idx][coor_idx] + 
                tmp[i\WINDOW_SIZE][15][axis_idx][coor_idx];
            }
        }

        if (i == 0){

            adders[i\WINDOW_SIZE].point1 <== res [i\WINDOW_SIZE];
            adders[i\WINDOW_SIZE].point2 <== tmp2[i\WINDOW_SIZE];
            res[i\WINDOW_SIZE + 1]       <== tmp2[i\WINDOW_SIZE];

        } else {

            adders[i\WINDOW_SIZE].point1 <== doublers[i - 1].out;
            adders[i\WINDOW_SIZE].point2 <== tmp2[i\WINDOW_SIZE];

            zeroEquals[i\WINDOW_SIZE] = IsEqual();

            zeroEquals[i\WINDOW_SIZE].in[0]<== 0;
            zeroEquals[i\WINDOW_SIZE].in[1]<== tmp2[i\WINDOW_SIZE][0][0];

            for (var axis_idx = 0; axis_idx < 2; axis_idx++){
                for(var coor_idx = 0; coor_idx < CHUNK_NUMBER; coor_idx++){

                    tmp3[i\WINDOW_SIZE][0][axis_idx][coor_idx] <== adders    [i\WINDOW_SIZE].out[axis_idx][coor_idx] * (1 - zeroEquals[i\WINDOW_SIZE].out);
                    tmp3[i\WINDOW_SIZE][1][axis_idx][coor_idx] <== zeroEquals[i\WINDOW_SIZE].out                     * doublers[i-1].out[axis_idx][coor_idx];
                    tmp4[i\WINDOW_SIZE]   [axis_idx][coor_idx] <== tmp3[i\WINDOW_SIZE][0][axis_idx][coor_idx]        + tmp3[i\WINDOW_SIZE][1][axis_idx][coor_idx]; 
                    tmp5[i\WINDOW_SIZE][0][axis_idx][coor_idx] <== (1 - tmpEquals[i\WINDOW_SIZE].out)                * tmp4[i\WINDOW_SIZE]   [axis_idx][coor_idx];
                    tmp5[i\WINDOW_SIZE][1][axis_idx][coor_idx] <== tmpEquals[i\WINDOW_SIZE].out                      * tmp2[i\WINDOW_SIZE]   [axis_idx][coor_idx];
                                    
                    res[i\WINDOW_SIZE + 1][axis_idx][coor_idx] <== tmp5[i\WINDOW_SIZE][0][axis_idx][coor_idx]        + tmp5[i\WINDOW_SIZE][1][axis_idx][coor_idx];                                 
                }
            }        
        }
    }

    out <== res[ADDERS_NUMBER];
}
