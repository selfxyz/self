// --------------------------------------------------
// Source: https://github.com/cursive-team/babyjubjub-ecdsa
// File: packages/circuits/baby-jubjub-ecdsa/baby_jubjub_ecdsa.circom
// License: MIT
// Author(s): cursive-team
// Changes: no changes
// --------------------------------------------------
pragma circom 2.1.9;

include "circomlib/circuits/babyjub.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/escalarmulany.circom";
/**
 *  BabyJubJubECDSA
 *  ====================
 *
 *  Converts inputted efficient ECDSA signature to an public key. There is no
 *  public key validation included. Takes in points in Twisted Edwards form
 *  and uses Edwards addition and scalar multiplication. Returns computed
 *  public key in Edwards form.
 */
template BabyJubJubECDSA() {
    var bits = 254;
    signal input s;
    signal input Tx; // T = r^-1 * R
    signal input Ty; // T is represented in Twisted Edwards form
    signal input Ux; // U = -(m * r^-1 * G)
    signal input Uy; // U is represented in Twisted Edwards form

    signal output pubKeyX; // Represented in Twisted Edwards form
    signal output pubKeyY;

    // bitify s
    component sBits = Num2Bits_strict();
    sBits.in <== s;

    // check T, U are on curve
    component checkT = BabyCheck();
    checkT.x <== Tx;
    checkT.y <== Ty;
    component checkU = BabyCheck();
    checkU.x <== Ux;
    checkU.y <== Uy;

    // sMultT = s * T
    component sMultT = EscalarMulAny(bits);
    var i;
    for (i=0; i<bits; i++) {
        sMultT.e[i] <== sBits.out[i];
    }
    sMultT.p[0] <== Tx;
    sMultT.p[1] <== Ty;

    // pubKey = sMultT + U
    component pubKey = BabyAdd();
    pubKey.x1 <== sMultT.out[0];
    pubKey.y1 <== sMultT.out[1];
    pubKey.x2 <== Ux;
    pubKey.y2 <== Uy;

    pubKeyX <== pubKey.xout;
    pubKeyY <== pubKey.yout;
}
