pragma circom 2.0.0;

include "../sha2Common.circom";

//------------------------------------------------------------------------------
// SHA384 / SHA512 compression function inner loop
//
// note: the d,h,inp,key inputs (and outputs) are 64 bit numbers;
// the rest are little-endian bit vectors.

template Sha2_384_512CompressInner() {
    
    signal input inp;
    signal input key;
    
    signal input a[64];
    signal input b[64];
    signal input c[64];
    signal input dd;
    signal input e[64];
    signal input f[64];
    signal input g[64];
    signal input hh;
    
    signal output outA[64];
    signal output outB[64];
    signal output outC[64];
    signal output outDD;
    signal output outE[64];
    signal output outF[64];
    signal output outG[64];
    signal output outHH;
    
    component dSum = GetSumOfNElements(64);
    component hSum = GetSumOfNElements(64);
    for (var i = 0; i < 64; i++) {
        outG[i] <== f[i];
        outF[i] <== e[i];
        outC[i] <== b[i];
        outB[i] <== a[i];
        dSum.in[i] <== (1 << i) * c[i];
        hSum.in[i] <== (1 << i) * g[i];
    }
    outDD <== dSum.out;
    outHH <== hSum.out;
    
    signal chb[64];
    
    component major[64];
    component s0Xor[64];
    component s1Xor[64];
    
    component s0Sum = GetSumOfNElements(64);
    component s1Sum = GetSumOfNElements(64);
    component mjSum = GetSumOfNElements(64);
    component chSum = GetSumOfNElements(64);
    
    for (var i = 0; i < 64; i++) {
        
        // ch(e,f,g) = if e then f else g = e(f-g)+g
        chb[i] <== e[i] * (f[i] - g[i]) + g[i];
        chSum.in[i] <== (1 << i) * chb[i];
        
        // maj(a,b,c) = at least two of them is 1 = second bit of the sum
        major[i] = Bits2();
        major[i].xy <== a[i] + b[i] + c[i];
        mjSum.in[i] <== (1 << i) * major[i].hi;
        
        s0Xor[i] = XOR3_v2();
        s0Xor[i].x <== a[ (i + 28) % 64 ];
        s0Xor[i].y <== a[ (i + 34) % 64 ];
        s0Xor[i].z <== a[ (i + 39) % 64 ];
        s0Sum.in[i] <== (1 << i) * s0Xor[i].out;
        
        s1Xor[i] = XOR3_v2();
        s1Xor[i].x <== e[ (i + 14) % 64 ];
        s1Xor[i].y <== e[ (i + 18) % 64 ];
        s1Xor[i].z <== e[ (i + 41) % 64 ];
         s1Sum.in[i] <== (1 << i) * s1Xor[i].out;
        
    }
    
    signal overflowE <== dd + hh + s1Sum.out + chSum.out + key + inp;
    signal overflowA <== hh + s1Sum.out + chSum.out + key + inp + s0Sum.out + mjSum.out;
    
   component decomposeE = GetLastNBits(64);
    decomposeE.in <== overflowE;
    decomposeE.out ==> outE;
    
    component decomposeA = GetLastNBits(64);
    decomposeA.in <== overflowA;
    decomposeA.out ==> outA;
    
}

//------------------------------------------------------------------------------
