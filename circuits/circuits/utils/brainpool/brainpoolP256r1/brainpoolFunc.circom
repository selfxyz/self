pragma circom 2.1.6;

function get_order(CHUNK_SIZE,CHUNK_NUMBER){

    assert ((CHUNK_SIZE == 43) && (CHUNK_NUMBER == 6));

    var ORDER[6];

    ORDER[0] = 7157953615527;
    ORDER[1] = 4625125213121;
    ORDER[2] = 6807085551317;
    ORDER[3] = 5808117106360;
    ORDER[4] = 7604705420896;
    ORDER[5] = 1460132624195;

    return ORDER;
}

function get_params(CHUNK_SIZE,CHUNK_NUMBER){
    
    assert ((CHUNK_SIZE == 43) && (CHUNK_NUMBER == 6));

    var A[6];
    var P[6];
    var B[6];

    var PARAMS[3][6];

    A[0] = 3594672715225;
    A[1] = 3897911224649;
    A[2] = 8718806090907;
    A[3] = 2852407574515;
    A[4] = 3036634083175;
    A[5] = 1076762962936;

    B[0] = 4505413093302;
    B[1] = 7680371292571;
    B[2] = 6966711199091;
    B[3] = 3216358751839;
    B[4] = 5105446236939;
    B[5] = 333811603922;


    P[0] = 125081375607;
    P[1] = 5239944249961;
    P[2] = 1893809557332;
    P[3] = 5808117106361;
    P[4] = 7604705420896;
    P[5] = 1460132624195;

    PARAMS[0] = A;
    PARAMS[1] = B;
    PARAMS[2] = P;
    
    return PARAMS;
}

function get_dummy_point(CHUNK_SIZE,CHUNK_NUMBER){

    assert ((CHUNK_SIZE == 43) && (CHUNK_NUMBER == 6));

    var G_X[6];
    G_X[0] = 3388304235908;
    G_X[1] = 4032733930425;
    G_X[2] = 7365882166150;
    G_X[3] = 7483795453108;
    G_X[4] = 4735531870343;
    G_X[5] = 20153295753;   

    var G_Y[6];
    G_Y[0] = 2121852786555;
    G_Y[1] = 2023660523771;
    G_Y[2] = 377054420119;
    G_Y[3] = 2147401067624;
    G_Y[4] = 1307469495555;
    G_Y[5] = 559867427305;   

    var DUMMY[2][6];
    DUMMY[0] = G_X;
    DUMMY[1] = G_Y;
    return DUMMY;
}


