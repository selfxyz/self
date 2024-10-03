pragma circom 2.1.9;

include "../openpassport_prove.circom";

component main { public [  scope, user_identifier, current_date, forbidden_countries_list] } = OPENPASSPORT_PROVE(8, 43, 6, 384, 192, 10);