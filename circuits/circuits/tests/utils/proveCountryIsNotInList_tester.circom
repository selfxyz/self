pragma circom  2.1.6;

include "../../disclose/proveCountryIsNotInList.circom";

component main { public [ smt_root,hostCountry ] } = ProveCountryNotInList();
