pragma circom 2.1.9;

include "../register.circom";

component main { public [ merkle_root ] } = REGISTER(512, 512, 26, 64, 6, 768, 256);