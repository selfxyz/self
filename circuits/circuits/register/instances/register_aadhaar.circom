pragma circom 2.1.9;

include "../registerAadhaar.circom";

component main  = AadhaarQRVerifier(121, 17, 512 * 3, 256);