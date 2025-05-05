pragma circom 2.1.9;

include "../registerAadhaar.circom";

component main  = AadhaarRegister(121, 17, 512 * 3, 256);