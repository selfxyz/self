pragma circom 2.0.0;
  
include "../sha2_common.circom";

//------------------------------------------------------------------------------
// SHA256 (and also SHA224) compression function inner loop
//
// note: the d,h,inp,key inputs (and outputs) are 32 bit numbers;
// the rest are little-endian bit vectors.

template SHA2_224_256_compress_inner() {
  
  signal input inp;
  signal input key;

  signal input a[32];    
  signal input b[32];
  signal input c[32];
  signal input dd;
  signal input e[32];
  signal input f[32];
  signal input g[32];
  signal input hh;

  signal output out_a[32];
  signal output out_b[32];
  signal output out_c[32];
  signal output out_dd;
  signal output out_e[32];
  signal output out_f[32];
  signal output out_g[32];
  signal output out_hh;

  out_g <== f;
  out_f <== e;
  out_c <== b;
  out_b <== a;

  var d_sum = 0;
  var h_sum = 0;
  for(var i=0; i<32; i++) {
    d_sum += (1<<i) * c[i];
    h_sum += (1<<i) * g[i];
  }
  out_dd <== d_sum;
  out_hh <== h_sum;
  
  signal chb[32];

  component major[32];
  component s0xor[32];
  component s1xor[32];

  var s0_sum = 0;
  var s1_sum = 0;
  var mj_sum = 0;
  var ch_sum = 0;

  for(var i=0; i<32; i++) {

    // ch(e,f,g) = if e then f else g = e(f-g)+g
    chb[i] <== e[i] * (f[i] - g[i]) + g[i];    
    ch_sum += (1<<i) * chb[i];

    // maj(a,b,c) = at least two of them is 1 = second bit of the sum
    major[i] = Bits2();
    major[i].xy <== a[i] + b[i] + c[i];
    mj_sum += (1<<i) * major[i].hi;

    s0xor[i] = XOR3_v2();
    s0xor[i].x <== a[ (i +  2) % 32 ];
    s0xor[i].y <== a[ (i + 13) % 32 ];
    s0xor[i].z <== a[ (i + 22) % 32 ];
    s0_sum += (1<<i) * s0xor[i].out;

    s1xor[i] = XOR3_v2();
    s1xor[i].x <== e[ (i +  6) % 32 ]; 
    s1xor[i].y <== e[ (i + 11) % 32 ];
    s1xor[i].z <== e[ (i + 25) % 32 ];
    s1_sum += (1<<i) * s1xor[i].out;

  }

  signal overflow_e <== dd + hh + s1_sum + ch_sum + key + inp;
  signal overflow_a <==      hh + s1_sum + ch_sum + key + inp + s0_sum + mj_sum;

  component decompose_e = Bits35();
  decompose_e.inp      <== overflow_e;
  decompose_e.out_bits ==> out_e;

  component decompose_a = Bits35();
  decompose_a.inp      <== overflow_a;
  decompose_a.out_bits ==> out_a;

}

//------------------------------------------------------------------------------
