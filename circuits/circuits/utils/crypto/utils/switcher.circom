pragma circom 2.1.6;

// This templates is used to swap 2 values if bool is 1 and do anything if boolean is 0 with 1 constraint
// This saves 1 constraint for simulating if operations
// For example:
// if (a == b) {res = a + b} else {a * b}
// To this we compare a * b and do this:
// res <== (a == b) * (a + b) + (1 - (a == b)) * (a * b) // U still need to create tmp signals, but this is idea
// Instead we can do this:
// switcher.bool <== a == b
// switcher.in[0] <== a * b
// switcher.in[1] <== a + b
// res <== switcher.out[0]
// we saved 1 constraint for basic operation, which is good!

template Switcher() {
    signal input bool;
    signal input in[2];
    signal output out[2];
    
    signal aux;
    
    aux <== (in[1] - in[0]) * bool; 
    out[0] <== aux + in[0];
    out[1] <==  -aux + in[1];
}