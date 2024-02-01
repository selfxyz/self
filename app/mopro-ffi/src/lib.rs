use mopro_core::middleware::circom;
use mopro_core::MoproError;

use num_bigint::BigInt;
use std::collections::HashMap;
use std::path::Path;
use std::str::FromStr;
use std::sync::RwLock;

#[derive(Debug)]
pub enum FFIError {
    MoproError(mopro_core::MoproError),
    SerializationError(String),
}

#[derive(Debug, Clone)]
pub struct GenerateProofResult {
    pub proof: Vec<u8>,
    pub inputs: Vec<u8>,
}

// NOTE: Make UniFFI and Rust happy, can maybe do some renaming here
#[allow(non_snake_case)]
#[derive(Debug, Clone)]
pub struct SetupResult {
    pub provingKey: Vec<u8>,
}

//     pub inputs: Vec<u8>,

impl From<mopro_core::MoproError> for FFIError {
    fn from(error: mopro_core::MoproError) -> Self {
        FFIError::MoproError(error)
    }
}

pub struct MoproCircom {
    state: RwLock<circom::CircomState>,
}

impl Default for MoproCircom {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(not(feature = "dylib"))]
pub fn initialize_mopro() -> Result<(), MoproError> {
    // TODO: Error handle / panic?
    circom::initialize();
    Ok(())
}

#[cfg(feature = "dylib")]
pub fn initialize_mopro() -> Result<(), MoproError> {
    println!("need to use dylib to init!");
    panic!("need to use dylib to init!");
}

#[cfg(feature = "dylib")]
pub fn initialize_mopro_dylib(dylib_path: String) -> Result<(), MoproError> {
    // TODO: Error handle / panic?
    let dylib_path = Path::new(dylib_path.as_str());
    circom::initialize(dylib_path);
    Ok(())
}

#[cfg(not(feature = "dylib"))]
pub fn initialize_mopro_dylib(dylib_path: String) -> Result<(), MoproError> {
    println!("dylib feature not enabled!");
    panic!("dylib feature not enabled!");
}

pub fn generate_proof2(
    inputs: HashMap<String, Vec<String>>,
) -> Result<GenerateProofResult, MoproError> {
    // Convert inputs to BigInt
    let bigint_inputs = inputs
        .into_iter()
        .map(|(k, v)| {
            (
                k,
                v.into_iter()
                    .map(|i| BigInt::from_str(&i).unwrap())
                    .collect(),
            )
        })
        .collect();

    let (proof, inputs) = circom::generate_proof2(bigint_inputs)?;

    let serialized_proof = circom::serialization::serialize_proof(&proof);
    let serialized_inputs = circom::serialization::serialize_inputs(&inputs);
    Ok(GenerateProofResult {
        proof: serialized_proof,
        inputs: serialized_inputs,
    })
}

pub fn verify_proof2(proof: Vec<u8>, public_input: Vec<u8>) -> Result<bool, MoproError> {
    let deserialized_proof = circom::serialization::deserialize_proof(proof);
    let deserialized_public_input = circom::serialization::deserialize_inputs(public_input);
    let is_valid = circom::verify_proof2(deserialized_proof, deserialized_public_input)?;
    Ok(is_valid)
}

// TODO: Use FFIError::SerializationError instead
impl MoproCircom {
    pub fn new() -> Self {
        Self {
            state: RwLock::new(circom::CircomState::new()),
        }
    }

    pub fn setup(&self, wasm_path: String, r1cs_path: String) -> Result<SetupResult, MoproError> {
        let mut state_guard = self.state.write().unwrap();
        let pk = state_guard.setup(wasm_path.as_str(), r1cs_path.as_str())?;
        Ok(SetupResult {
            provingKey: circom::serialization::serialize_proving_key(&pk),
        })
    }

    //             inputs: circom::serialization::serialize_inputs(&inputs),

    pub fn generate_proof(
        &self,
        inputs: HashMap<String, Vec<String>>,
    ) -> Result<GenerateProofResult, MoproError> {
        let mut state_guard = self.state.write().unwrap();

        // Convert inputs to BigInt
        let bigint_inputs = inputs
            .into_iter()
            .map(|(k, v)| {
                (
                    k,
                    v.into_iter()
                        .map(|i| BigInt::from_str(&i).unwrap())
                        .collect(),
                )
            })
            .collect();

        let (proof, inputs) = state_guard.generate_proof(bigint_inputs)?;

        Ok(GenerateProofResult {
            proof: circom::serialization::serialize_proof(&proof),
            inputs: circom::serialization::serialize_inputs(&inputs),
        })
    }

    pub fn verify_proof(&self, proof: Vec<u8>, public_input: Vec<u8>) -> Result<bool, MoproError> {
        let state_guard = self.state.read().unwrap();
        let deserialized_proof = circom::serialization::deserialize_proof(proof);
        let deserialized_public_input = circom::serialization::deserialize_inputs(public_input);
        let is_valid = state_guard.verify_proof(deserialized_proof, deserialized_public_input)?;
        Ok(is_valid)
    }
}

fn add(a: u32, b: u32) -> u32 {
    a + b
}

fn hello() -> String {
    "Hello World from Rust".to_string()
}

// TODO: Remove me
// UniFFI expects String type
// See https://mozilla.github.io/uniffi-rs/udl/builtin_types.html
// fn run_example(wasm_path: String, r1cs_path: String) -> Result<(), MoproError> {
//     circom::run_example(wasm_path.as_str(), r1cs_path.as_str())
// }

uniffi::include_scaffolding!("mopro");

#[cfg(test)]
mod tests {
    use super::*;
    use ark_bn254::Fr;
    use num_bigint::BigUint;

    fn bytes_to_circuit_inputs(input_vec: &Vec<u8>) -> HashMap<String, Vec<String>> {
        let bits = circom::utils::bytes_to_bits(&input_vec);
        let converted_vec: Vec<String> = bits
            .into_iter()
            .map(|bit| (bit as i32).to_string())
            .collect();
        let mut inputs = HashMap::new();
        inputs.insert("in".to_string(), converted_vec);
        inputs
    }

    fn bytes_to_circuit_outputs(bytes: &[u8]) -> Vec<u8> {
        let bits = circom::utils::bytes_to_bits(bytes);
        let field_bits = bits.into_iter().map(|bit| Fr::from(bit as u8)).collect();
        let circom_outputs = circom::serialization::SerializableInputs(field_bits);
        circom::serialization::serialize_inputs(&circom_outputs)
    }

    #[test]
    fn add_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }

    #[test]
    fn test_end_to_end() -> Result<(), MoproError> {
        // Paths to your wasm and r1cs files
        let wasm_path =
            "./../mopro-core/examples/circom/multiplier2/target/multiplier2_js/multiplier2.wasm";
        let r1cs_path = "./../mopro-core/examples/circom/multiplier2/target/multiplier2.r1cs";

        // Create a new MoproCircom instance
        let mopro_circom = MoproCircom::new();

        // Step 1: Setup
        let setup_result = mopro_circom.setup(wasm_path.to_string(), r1cs_path.to_string())?;
        assert!(setup_result.provingKey.len() > 0);

        let mut inputs = HashMap::new();
        let a = BigUint::from_str(
            "21888242871839275222246405745257275088548364400416034343698204186575808495616",
        )
        .unwrap();
        let b = BigUint::from(1u8);
        let c = a.clone() * b.clone();
        inputs.insert("a".to_string(), vec![a.to_string()]);
        inputs.insert("b".to_string(), vec![b.to_string()]);
        // output = [public output c, public input a]
        let expected_output = vec![Fr::from(c), Fr::from(a)];
        let circom_outputs = circom::serialization::SerializableInputs(expected_output);
        let serialized_outputs = circom::serialization::serialize_inputs(&circom_outputs);

        // Step 2: Generate Proof
        let generate_proof_result = mopro_circom.generate_proof(inputs)?;
        let serialized_proof = generate_proof_result.proof;
        let serialized_inputs = generate_proof_result.inputs;

        assert!(serialized_proof.len() > 0);
        assert_eq!(serialized_inputs, serialized_outputs);

        // Step 3: Verify Proof
        let is_valid = mopro_circom.verify_proof(serialized_proof, serialized_inputs)?;
        assert!(is_valid);

        Ok(())
    }

    #[test]
    fn test_end_to_end_keccak() -> Result<(), MoproError> {
        // Paths to your wasm and r1cs files
        let wasm_path =
            "./../mopro-core/examples/circom/keccak256/target/keccak256_256_test_js/keccak256_256_test.wasm";
        let r1cs_path = "./../mopro-core/examples/circom/keccak256/target/keccak256_256_test.r1cs";

        // Create a new MoproCircom instance
        let mopro_circom = MoproCircom::new();

        // Step 1: Setup
        let setup_result = mopro_circom.setup(wasm_path.to_string(), r1cs_path.to_string())?;
        assert!(setup_result.provingKey.len() > 0);

        // Prepare inputs
        let input_vec = vec![
            116, 101, 115, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0,
        ];

        // Expected output
        let expected_output_vec = vec![
            37, 17, 98, 135, 161, 178, 88, 97, 125, 150, 143, 65, 228, 211, 170, 133, 153, 9, 88,
            212, 4, 212, 175, 238, 249, 210, 214, 116, 170, 85, 45, 21,
        ];

        let inputs = bytes_to_circuit_inputs(&input_vec);
        let serialized_outputs = bytes_to_circuit_outputs(&expected_output_vec);

        // Step 2: Generate Proof
        let generate_proof_result = mopro_circom.generate_proof(inputs)?;
        let serialized_proof = generate_proof_result.proof;
        let serialized_inputs = generate_proof_result.inputs;

        assert!(serialized_proof.len() > 0);
        assert_eq!(serialized_inputs, serialized_outputs);

        // Step 3: Verify Proof

        let is_valid = mopro_circom.verify_proof(serialized_proof, serialized_inputs)?;
        assert!(is_valid);

        Ok(())
    }
}
