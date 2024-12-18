pragma circom 2.0.0;


function process_padding(LEN, LEN_PADDED){
    
    var tmp_len = LEN;
    var bit_len[128];
    var len_bit_len = 0;
    var is_zero = 0;
    for (var i = 0; i < 128; i++){
        bit_len[i] = tmp_len % 2;
        tmp_len = tmp_len \ 2;
        if (tmp_len == 0 && is_zero == 0){
            len_bit_len = i + 1;
            is_zero = 1;
            
        }
    }
    var padding[1536]; 
   
    padding[0] = 1;
    for (var i = 1; i < LEN_PADDED - LEN - len_bit_len; i++){
        padding[i] = 0;
    }
    for (var i = LEN_PADDED - LEN - 1; i >= LEN_PADDED - LEN - len_bit_len; i--){
        padding[i] = bit_len[LEN_PADDED - LEN - 1 - i];
    }

    return padding;
}

// Universal sha-1 and sha-2 padding.
// HASH_BLOCK_SIZE is 512 for sha-1, sha2-224, sha2-256
// HASH_BLOCK_SIZE is 1024 for sha2-384, sha2-512
// LEN is bit len of message
template ShaPadding(LEN, HASH_BLOCK_SIZE){

    var CHUNK_NUMBER = ((LEN + 1 + 128) + HASH_BLOCK_SIZE - 1) \ HASH_BLOCK_SIZE;

    signal input in[LEN];
    signal output out[CHUNK_NUMBER * HASH_BLOCK_SIZE];

    for (var i = 0; i < LEN; i++){
        out[i] <== in[i];
    }

    var padding[1536] = process_padding(LEN, CHUNK_NUMBER * HASH_BLOCK_SIZE);
    for (var i = LEN; i < CHUNK_NUMBER * HASH_BLOCK_SIZE; i++){
        out[i] <== padding[i - LEN];
    }

}

//------------------------------------------------------------------------------
// decompose a 2-bit number into a high and a low bit

template Bits2() {
    signal input  xy;
    signal output lo;
    signal output hi;
    
    lo <-- xy & 1;
    hi <-- (xy >> 1) & 1;
    
    lo * (1 - lo) === 0;
    hi * (1 - hi) === 0;
    
    xy === 2 * hi + lo;
}

//------------------
// same number of constraints (that is, 2), in the general case
// however circom can optimize y=0 or z=0, unlike with the above
// and hopefully also x=0.
// used in sha256 and sha512
template XOR3_v2() {
    signal input  x;
    signal input  y;
    signal input  z;
    signal output out;
    
    signal tmp <== y * z;
    out <== x * (1 - 2 * y - 2 * z + 4 * tmp) + y + z - 2 * tmp;
}

// for many xors use this one
// used in sha1
template XOR3_v3(n) {
    signal input a[n];
    signal input b[n];
    signal input c[n];
    signal output out[n];
    signal mid[n];
    
    for (var k = 0; k < n; k++) {
        mid[k] <== b[k] * c[k];
        out[k] <== a[k] * (1 - 2 * b[k] - 2 * c[k] + 4 * mid[k]) + b[k] + c[k] - 2 * mid[k];
    }
}

