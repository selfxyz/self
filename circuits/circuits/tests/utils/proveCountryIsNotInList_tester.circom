pragma circom  2.1.6;

include "../../disclose/proveCountryIsNotInList.circom";

component main { public [ merkle_root,smt_root,hostCountry ] } = ProveCountryNotInList(16);
