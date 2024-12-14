pragma circom  2.1.6;

// Here are templates for all bit gates for any 1 or 2 inputs
// for 1-input gates interface is input in and output out
// for 2-input gates interface is input in[2] and output out
// 3-input gates may be added later


//One input gates
//------------------------------------------------------------------------------------------------------------------------------------------------

// a
// 0 -> 0
// 1 -> 1
template BUFFER(){
    signal input in;
    signal output out;

    out <== in;
}

// !a
// !0 = 1
// !1 = 0
template NOT(){
    signal input in;
    signal output out;

    out <== 1 - in;
}


//------------------------------------------------------------------------------------------------------------------------------------------------
//Two input gates
//------------------------------------------------------------------------------------------------------------------------------------------------


// a ∧ b
// 0 ∧ 0 = 0
// 1 ∧ 0 = 0
// 0 ∧ 1 = 0
// 1 ∧ 1 = 1
template AND(){
    signal input in[2];
    signal output out;

    out <== in[0] * in[1];
}

// a ∨ b
// 0 ∨ 0 = 0
// 1 ∨ 0 = 1
// 0 ∨ 1 = 1
// 1 ∨ 1 = 1
template OR(){
    signal input in[2];
    signal output out;

    out <== in[0] + in[1] - in[0] * in[1];
}

// !(a ∧ b)
// !(0 ∧ 0) = 1
// !(1 ∧ 0) = 1
// !(0 ∧ 1) = 1
// !(1 ∧ 1) = 0
template NAND(){
    signal input in[2];
    signal output out;

    out <== 1 - in[0] * in[1];
}

// !(a ∨ b)
// !(0 ∨ 0) = 1
// !(1 ∨ 0) = 0
// !(0 ∨ 1) = 0
// !(1 ∨ 1) = 0
template NOR(){
    signal input in[2];
    signal output out;

    out <== 1 - in[0] + in[1] + in[0] * in[1];
}

// A ⊕ B
// 0 ⊕ 0 = 0
// 1 ⊕ 0 = 1
// 0 ⊕ 1 = 1
// 1 ⊕ 1 = 0
template XOR(){
    signal input in[2];
    signal output out;

    out <== in[0] + in[1] - 2 * in[0] * in[1];
} 

// !(A ⊕ B)
// !(0 ⊕ 0) = 1
// !(1 ⊕ 0) = 0
// !(0 ⊕ 1) = 0
// !(1 ⊕ 1) = 1
template XNOR(){
    signal input in[2];
    signal output out;

    out <== 1 - in[0] - in[1] + 2 * in[0] * in[1];
}

// A → B
// 0 → 0 = 1
// 1 → 0 = 1
// 0 → 1 = 0
// 1 → 1 = 1
template IMPLY(){
    signal input in[2];
    signal output out;

    out <== 1 - in[0] + in[1] - (1 - in[0]) * in[1];
}

// !(A → B)
// !(0 → 0) = 0
// !(1 → 0) = 0
// !(0 → 1) = 1
// !(1 → 1) = 0
template NIMPLY(){
    signal input in[2];
    signal output out;

    out <== in[0] - in[1] + (1 - in[0]) * in[1];
}

// A
// 0 0 -> 0
// 1 0 -> 1
// 0 1 -> 0
// 1 1 -> 1
template A(){
    signal input in[2];
    signal output out;

    out <== in[0];
}

// !A
// 0 0 -> 1
// 1 0 -> 0
// 0 1 -> 1
// 1 1 -> 0
template NOTA(){
    signal input in[2];
    signal output out;

    out <== 1 - in[0];
}

// B
// 0 0 -> 0
// 1 0 -> 0
// 0 1 -> 1
// 1 1 -> 1
template B(){
    signal input in[2];
    signal output out;

    out <== in[1];
}

// !B
// 0 0 -> 1
// 1 0 -> 1
// 0 1 -> 0
// 1 1 -> 0
template NOTB(){
    signal input in[2];
    signal output out;

    out <== 1 - in[1];
}


// true
// 0 0 -> 1
// 1 0 -> 1
// 0 1 -> 1
// 1 1 -> 1
template TRUE(){
    signal input in[2];
    signal output out;

    out <== 1;
}

// true
// 0 0 -> 0
// 1 0 -> 0
// 0 1 -> 0
// 1 1 -> 0
template FALSE(){
    signal input in[2];
    signal output out;

    out <== 0;
}

// B → A
// 0 0 -> 0
// 1 0 -> 1
// 0 1 -> 0
// 1 1 -> 0
template INVIMPLY(){
    signal input in[2];
    signal output out;

    out <== 1 + in[0] - in[1] - in[0] * (1 - in[1]);
}

// !(B → A)
// 0 0 -> 1
// 1 0 -> 0
// 0 1 -> 1
// 1 1 -> 1
template NINVNIMPLY(){
    signal input in[2];
    signal output out;

    out <== in[1] - in[0] + in[0] * (1 - in[1]);
}

// Xor for n pairs
template Xor2(n) {
    signal input in1[n];
    signal input in2[n];
    signal output out[n];

    for (var k = 0; k < n; k++) {
        out[k] <== in1[k] + in2[k] - 2 * in1[k] * in2[k];
    }
}

//------------------------------------------------------------------------------------------------------------------------------------------------
//Three input gates (not all cases!!!)
//------------------------------------------------------------------------------------------------------------------------------------------------
