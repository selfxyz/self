pragma circom 2.1.9;

include "../register.circom";

component main { public [ merkle_root ] } = REGISTER(512, 512, 41, 66, 8, 896, 256);