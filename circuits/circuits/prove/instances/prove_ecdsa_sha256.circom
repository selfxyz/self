pragma circom 2.1.6;

include "../openpassport_prove.circom";

component main { public [ user_identifier, scope ] } = OPENPASSPORT_PROVE(8, 43, 6, 640, 512);