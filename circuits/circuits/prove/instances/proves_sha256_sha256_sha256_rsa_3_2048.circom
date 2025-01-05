pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [ scope, user_identifier, current_date ] } = OPENPASSPORT_PROVE(256, 256, 13, 64, 32, 384, 192, 20);