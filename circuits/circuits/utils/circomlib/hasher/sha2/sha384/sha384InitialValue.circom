pragma circom 2.0.0;

//------------------------------------------------------------------------------
// initial hash value for SHA2-384

template Sha384InitialValues() {
    
    signal output out[8][64];
    
    var INITIAL_STATE[8] =
    [
    0xcbbb9d5dc1059ed8,
    0x629a292a367cd507,
    0x9159015a3070dd17,
    0x152fecd8f70e5939,
    0x67332667ffc00b31,
    0x8eb44a8768581511,
    0xdb0c2e0d64f98fa7,
    0x47b5481dbefa4fa4
    ];
    
    for (var k = 0; k < 8; k++) {
        for (var i = 0; i < 64; i++) {
            out[k][i] <== (INITIAL_STATE[k] >> i) & 1;
        }
    }
}
