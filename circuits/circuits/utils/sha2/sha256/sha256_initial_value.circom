pragma circom 2.0.0;

//------------------------------------------------------------------------------
// initial hash value for SHA2-256 

template Sha256_initial_value() {

  signal output out[8][32];

  var initial_state[8] =  
        [ 0x6a09e667
        , 0xbb67ae85
        , 0x3c6ef372
        , 0xa54ff53a
        , 0x510e527f
        , 0x9b05688c
        , 0x1f83d9ab
        , 0x5be0cd19
        ];

  for(var k=0; k<8; k++) { 
    for(var i=0; i<32; i++) {
      out[k][i] <== (initial_state[k] >> i) & 1; 
    }
  }

}
