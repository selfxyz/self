use mopro_core::middleware::circom::CircomState;
use num_bigint::BigInt;
use std::collections::HashMap;

fn main() {
    let wasm_path = "./examples/circom/multiplier2/target/multiplier2_js/multiplier2.wasm";
    let r1cs_path = "./examples/circom/multiplier2/target/multiplier2.r1cs";

    // Instantiate CircomState
    let mut circom_state = CircomState::new();

    // Setup
    let setup_res = circom_state.setup(wasm_path, r1cs_path);
    assert!(setup_res.is_ok());

    let _serialized_pk = setup_res.unwrap();

    // Deserialize the proving key and inputs if necessary

    // Prepare inputs
    let mut inputs = HashMap::new();
    inputs.insert("a".to_string(), vec![BigInt::from(3)]);
    inputs.insert("b".to_string(), vec![BigInt::from(5)]);

    // Proof generation
    let generate_proof_res = circom_state.generate_proof(inputs);

    // Check and print the error if there is one
    if let Err(e) = &generate_proof_res {
        println!("Error: {:?}", e);
    }

    assert!(generate_proof_res.is_ok());

    let (serialized_proof, serialized_inputs) = generate_proof_res.unwrap();

    // Proof verification
    let verify_res = circom_state.verify_proof(serialized_proof, serialized_inputs);
    assert!(verify_res.is_ok());
    assert!(verify_res.unwrap()); // Verifying that the proof was indeed verified
}
