pragma circom 2.1.9;

include "../registerAadhar.circom";

component main { } = AadhaarQRVerifier(121, 17, 512 * 3);