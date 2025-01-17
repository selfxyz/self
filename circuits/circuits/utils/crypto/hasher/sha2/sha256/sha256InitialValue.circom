pragma circom 2.0.0;

//------------------------------------------------------------------------------
// initial hash value for SHA2-256 

template Sha256InitialValue() {
    
    signal output out[8][32];
    
    var INITIAL_STATE[8] =
    [ 0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19
    ];
    
    for (var k = 0; k < 8; k++) {
        for (var i = 0; i < 32; i++) {
            out[k][i] <== (INITIAL_STATE[k] >> i) & 1;
        }
    }
    
}
