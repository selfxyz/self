pragma circom 2.1.5;

include "./rsa.circom";

component main{public [modulus]} = RSAVerify65537(64, 32);
