use ark_bn254::Bn254;
use ark_ec::pairing::Pairing;
use ark_groth16::{Proof, ProvingKey};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use color_eyre::Result;

#[derive(CanonicalSerialize, CanonicalDeserialize, Clone, Debug)]
pub struct SerializableProvingKey(pub ProvingKey<Bn254>);

#[derive(CanonicalSerialize, CanonicalDeserialize, Clone, Debug)]
pub struct SerializableProof(pub Proof<Bn254>);

#[derive(CanonicalSerialize, CanonicalDeserialize, Clone, Debug, PartialEq)]
pub struct SerializableInputs(pub Vec<<Bn254 as Pairing>::ScalarField>);

pub fn serialize_proof(proof: &SerializableProof) -> Vec<u8> {
    let mut serialized_data = Vec::new();
    proof
        .serialize_uncompressed(&mut serialized_data)
        .expect("Serialization failed");
    serialized_data
}

pub fn deserialize_proof(data: Vec<u8>) -> SerializableProof {
    SerializableProof::deserialize_uncompressed(&mut &data[..]).expect("Deserialization failed")
}

pub fn serialize_proving_key(pk: &SerializableProvingKey) -> Vec<u8> {
    let mut serialized_data = Vec::new();
    pk.serialize_uncompressed(&mut serialized_data)
        .expect("Serialization failed");
    serialized_data
}

pub fn deserialize_proving_key(data: Vec<u8>) -> SerializableProvingKey {
    SerializableProvingKey::deserialize_uncompressed(&mut &data[..])
        .expect("Deserialization failed")
}

pub fn serialize_inputs(inputs: &SerializableInputs) -> Vec<u8> {
    let mut serialized_data = Vec::new();
    inputs
        .serialize_uncompressed(&mut serialized_data)
        .expect("Serialization failed");
    serialized_data
}

pub fn deserialize_inputs(data: Vec<u8>) -> SerializableInputs {
    SerializableInputs::deserialize_uncompressed(&mut &data[..]).expect("Deserialization failed")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::middleware::circom::serialization::SerializableProvingKey;
    use crate::middleware::circom::utils::assert_paths_exists;
    use crate::MoproError;
    use ark_bn254::Bn254;
    use ark_circom::{CircomBuilder, CircomConfig};
    use ark_groth16::Groth16;
    use ark_std::rand::thread_rng;
    use color_eyre::Result;

    type GrothBn = Groth16<Bn254>;

    fn generate_serializable_proving_key(
        wasm_path: &str,
        r1cs_path: &str,
    ) -> Result<SerializableProvingKey, MoproError> {
        assert_paths_exists(wasm_path, r1cs_path)?;

        let cfg = CircomConfig::<Bn254>::new(wasm_path, r1cs_path)
            .map_err(|e| MoproError::CircomError(e.to_string()))?;

        let builder = CircomBuilder::new(cfg);
        let circom = builder.setup();

        let mut rng = thread_rng();
        let raw_params = GrothBn::generate_random_parameters_with_reduction(circom, &mut rng)
            .map_err(|e| MoproError::CircomError(e.to_string()))?;

        Ok(SerializableProvingKey(raw_params))
    }

    #[test]
    fn test_serialization_deserialization() {
        let wasm_path = "./examples/circom/multiplier2/target/multiplier2_js/multiplier2.wasm";
        let r1cs_path = "./examples/circom/multiplier2/target/multiplier2.r1cs";

        // Generate a serializable proving key for testing
        let serializable_pk = generate_serializable_proving_key(wasm_path, r1cs_path)
            .expect("Failed to generate serializable proving key");

        // Serialize
        let serialized_data = serialize_proving_key(&serializable_pk);

        // Deserialize
        let deserialized_pk = deserialize_proving_key(serialized_data);

        // Assert that the original and deserialized ProvingKeys are the same
        assert_eq!(
            serializable_pk.0, deserialized_pk.0,
            "Original and deserialized proving keys do not match"
        );
    }
}
