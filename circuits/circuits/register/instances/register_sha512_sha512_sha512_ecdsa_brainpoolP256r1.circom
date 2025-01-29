pragma circom 2.1.9;

include "../register.circom";

component main { public [ merkle_root ] } = REGISTER(512, 512, 25, 64, 4, 768, 256);