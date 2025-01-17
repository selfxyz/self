pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [ scope, user_identifier, current_date ] } = OPENPASSPORT_PROVE(256, 256, 32, 120, 35, 448, 128, 20);