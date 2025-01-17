pragma circom 2.0.0;

//------------------------------------------------------------------------------
// initial hash value for SHA2-224

template Sha224InitialValue() {
    
    signal output out[8][32];
    
    var INITIAL_STATE[8] =
    [
    0xc1059ed8,
    0x367cd507,
    0x3070dd17,
    0xf70e5939,
    0xffc00b31,
    0x68581511,
    0x64f98fa7,
    0xbefa4fa4
    ];
    
    for (var k = 0; k < 8; k++) {
        for (var i = 0; i < 32; i++) {
            out[k][i] <== (INITIAL_STATE[k] >> i) & 1;
        }
    }
    
}
