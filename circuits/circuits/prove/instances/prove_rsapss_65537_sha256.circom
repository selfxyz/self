pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [ user_identifier, scope ] }  = OPENPASSPORT_PROVE(4, 64, 32, 384, 192);
