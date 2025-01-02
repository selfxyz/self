pragma circom 2.0.0;

include "../sha2Common.circom";

//------------------------------------------------------------------------------
// SHA256 (and also SHA224) compression function inner loop
//
// note: the d,h,inp,key inputs (and outputs) are 32 bit numbers;
// the rest are little-endian bit vectors.

template Sha2_224_256CompressInner() {
    
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
    
    signal output outA[32];
    signal output outB[32];
    signal output outC[32];
    signal output outDD;
    signal output outE[32];
    signal output outF[32];
    signal output outG[32];
    signal output outHH;
    
    outG <== f;
    outF <== e;
    outC <== b;
    outB <== a;
    
    component dSum = GetSumOfNElements(32);
    component hSum = GetSumOfNElements(32);
    
    for (var i = 0; i < 32; i++) {
        dSum.in[i] <== (1 << i) * c[i];
        hSum.in[i] <== (1 << i) * g[i];
    }
    outDD <== dSum.out;
    outHH <== hSum.out;
    
    signal chb[32];
    
    component major[32];
    component s0Xor[32];
    component s1Xor[32];
    
    component s0Sum = GetSumOfNElements(32);
    component s1Sum = GetSumOfNElements(32);
    component mjSum = GetSumOfNElements(32);
    component chSum = GetSumOfNElements(32);
    
    for (var i = 0; i < 32; i++) {
        
        // ch(e,f,g) = if e then f else g = e(f-g)+g
        chb[i] <== e[i] * (f[i] - g[i]) + g[i];
        chSum.in[i] <== (1 << i) * chb[i];
        
        // maj(a,b,c) = at least two of them is 1 = second bit of the sum
        major[i] = Bits2();
        major[i].xy <== a[i] + b[i] + c[i];
        mjSum.in[i] <== (1 << i) * major[i].hi;
        
        s0Xor[i] = XOR3_v2();
        s0Xor[i].x <== a[ (i + 2) % 32 ];
        s0Xor[i].y <== a[ (i + 13) % 32 ];
        s0Xor[i].z <== a[ (i + 22) % 32 ];
        s0Sum.in[i] <== (1 << i) * s0Xor[i].out;
        
        s1Xor[i] = XOR3_v2();
        s1Xor[i].x <== e[ (i + 6) % 32 ];
        s1Xor[i].y <== e[ (i + 11) % 32 ];
        s1Xor[i].z <== e[ (i + 25) % 32 ];
        s1Sum.in[i] <== (1 << i) * s1Xor[i].out;
        
    }
    
    signal overflowE <== dd + hh + s1Sum.out + chSum.out + key + inp;
    signal overflowA <== hh + s1Sum.out + chSum.out + key + inp + s0Sum.out + mjSum.out;
    
    component decomposeE = GetLastNBits(32);
    decomposeE.in <== overflowE;
    decomposeE.out ==> outE;
    
    component decomposeA = GetLastNBits(32);
    decomposeA.in <== overflowA;
    decomposeA.out ==> outA;
    
}

//------------------------------------------------------------------------------
