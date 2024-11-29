pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [ scope, user_identifier, current_date ] } = OPENPASSPORT_PROVE(14, 64, 48, 384, 192, 20);