use ark_circom::{ethereum, CircomBuilder, CircomConfig, circom::CircomReduction, WitnessCalculator};
use ark_std::rand::thread_rng;
use color_eyre::Result;
use std::os::raw::c_int;

use ark_bn254::Bn254;
use ark_crypto_primitives::snark::SNARK;
use ark_groth16::{Groth16, Proof};
use ark_ec::AffineRepr;

use num_bigint::{BigInt, Sign, ToBigInt};
extern crate hex;
use hex::decode;

type GrothBn = Groth16<Bn254>;

extern crate jni;
use jni::objects::{JClass, JObject, JValue, JString};
use jni::JNIEnv;
use jni::sys::jstring;

use log::Level;
use android_logger::Config;

extern crate serde;
extern crate serde_json;
use serde_json::json;
#[macro_use]
extern crate serde_derive;

use std::{
    collections::HashMap,
    time::Instant,
    convert::TryInto,
    sync::Mutex
};

use wasmer::{Module, Store};
use once_cell::sync::{Lazy, OnceCell};

mod zkey;
pub use zkey::{read_zkey, read_zkey_from_include_bytes};


#[no_mangle]
pub extern "C" fn Java_io_tradle_nfc_RNPassportReaderModule_callRustCode(
    env: JNIEnv,
    _: JClass,
) -> jstring {
    android_logger::init_once(Config::default().with_min_level(Level::Trace));
    log::error!("PROOF OF PASSPORT ---- log before imports");

    let my_int: c_int = -1;
    let my_str: String = "no_proof".to_string();
    
    let combined = json!({
        "my_int": my_int,
        "my_str": my_str
    });
    
    let combined_str = combined.to_string();
    let output = env.new_string(combined_str).expect("Couldn't create java string!");

    output.into_inner()
}

const WASM: &'static [u8] = include_bytes!("../passport/proof_of_passport.wasm");
static WITNESS_CALCULATOR: OnceCell<Mutex<WitnessCalculator>> = OnceCell::new();

#[cfg(not(feature = "dylib"))]
#[must_use]
pub fn witness_calculator() -> &'static Mutex<WitnessCalculator> {
    WITNESS_CALCULATOR.get_or_init(|| {
        let store = Store::default();
        let module = Module::from_binary(&store, WASM).expect("WASM should be valid");
        let result =
            WitnessCalculator::from_module(module).expect("Failed to create WitnessCalculator");
        Mutex::new(result)
    })
}

#[no_mangle]
pub extern "C" fn Java_io_tradle_nfc_RNPassportReaderModule_provePassport(
    env: JNIEnv,
    _: JClass,
    mrz: JObject,
    reveal_bitmap: JObject,
    data_hashes: JObject,
    e_content_bytes: JObject,
    signature: JObject,
    pubkey: JObject,
    address: JString,
) -> jstring {
    
    log::error!("PROOF OF PASSPORT ---- formatting inputsaaaa...");
    fn run_proof(
        mrz: JObject,
        reveal_bitmap: JObject,
        data_hashes: JObject,
        e_content_bytes: JObject,
        signature: JObject,
        pubkey: JObject,
        address: JString,
        env: JNIEnv
    ) -> Result<jstring, Box<dyn std::error::Error>> {
        android_logger::init_once(Config::default().with_min_level(Level::Trace));


        log::error!("PROOF OF PASSPORT ---- loading zkey...");
        let start = Instant::now();
        let now = Instant::now();
        let file_bytes: &'static [u8] = include_bytes!("../passport/proof_of_passport_final.zkey");
        log::error!("PROOF OF PASSPORT ---- zkey size: {}", file_bytes.len());
        let (params, matrices) = read_zkey_from_include_bytes(file_bytes).unwrap();
        log::error!("PROOF OF PASSPORT ---- zkey loaded. Took: {:?}", now.elapsed());
        let now = Instant::now();

        log::error!("PROOF OF PASSPORT ---- formatting inputs...");
        log::error!("PROOF OF PASSPORT ---- mrz_veccccccc");
        
        let mrz_vec: Vec<String> = java_arraylist_to_rust_vec(&env, mrz)?;
        let reveal_bitmap_vec: Vec<String> = java_arraylist_to_rust_vec(&env, reveal_bitmap)?;
        let data_hashes_vec: Vec<String> = java_arraylist_to_rust_vec(&env, data_hashes)?;
        let e_content_bytes_vec: Vec<String> = java_arraylist_to_rust_vec(&env, e_content_bytes)?;
        let signature_vec: Vec<String> = java_arraylist_to_rust_vec(&env, signature)?;
        let pubkey_vec: Vec<String> = java_arraylist_to_rust_vec(&env, pubkey)?;
        let address_str: String = env.get_string(address)?.into();

        log::error!("PROOF OF PASSPORT ---- mrz_vec {:?}", mrz_vec);
        log::error!("PROOF OF PASSPORT ---- reveal_bitmap_vec {:?}", reveal_bitmap_vec);
        log::error!("PROOF OF PASSPORT ---- data_hashes_vec {:?}", data_hashes_vec);
        log::error!("PROOF OF PASSPORT ---- e_content_bytes_vec {:?}", e_content_bytes_vec);
        log::error!("PROOF OF PASSPORT ---- signature_vec {:?}", signature_vec);
        log::error!("PROOF OF PASSPORT ---- pubkey_vec {:?}", pubkey_vec);
        log::error!("PROOF OF PASSPORT ---- address_str {:?}", address_str);

        fn parse_and_insert(hash_map: &mut HashMap<String, Vec<BigInt>>, key: &str, data: Vec<&str>) {
            let parsed_data: Vec<BigInt> = data.into_iter()
                .filter_map(|s| s.parse::<u128>().ok().and_then(|num| num.to_bigint()))
                .collect();
            hash_map.insert(key.to_string(), parsed_data);
        }

        let mut inputs: HashMap<String, Vec<num_bigint::BigInt>> = HashMap::new();
        parse_and_insert(&mut inputs, "mrz", mrz_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "reveal_bitmap", reveal_bitmap_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "dataHashes", data_hashes_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "eContentBytes", e_content_bytes_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "signature", signature_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "pubkey", pubkey_vec.iter().map(AsRef::as_ref).collect());
        let address_bigint = BigInt::from_bytes_be(Sign::Plus, &decode(&address_str[2..])?);
        inputs.insert("address".to_string(), vec![address_bigint]);

        let mut rng = thread_rng();
        use ark_std::UniformRand;
        let num_inputs = matrices.num_instance_variables;
        let num_constraints = matrices.num_constraints;
        let rng = &mut rng;

        let r = ark_bn254::Fr::rand(rng);
        let s = ark_bn254::Fr::rand(rng);

        let full_assignment = witness_calculator()
        .lock()
        .expect("Failed to lock witness calculator")
        .calculate_witness_element::<Bn254, _>(inputs, false)
        .unwrap();
        log::error!("PROOF OF PASSPORT ---- witness calculated. Took: {:?}", now.elapsed());
        let now = Instant::now();

        let proof = Groth16::<Bn254, CircomReduction>::create_proof_with_reduction_and_matrices(
            &params,
            r,
            s,
            &matrices,
            num_inputs,
            num_constraints,
            full_assignment.as_slice(),
        )
        .unwrap();
        log::error!("PROOF OF PASSPORT ---- proof done. Took: {:?}", now.elapsed());
        let now = Instant::now();

        let pvk = Groth16::<Bn254>::process_vk(&params.vk).unwrap();
        let inputs = &full_assignment[1..num_inputs];
        let verified = Groth16::<Bn254>::verify_with_processed_vk(&pvk, inputs, &proof).unwrap();

        assert!(verified);

        log::error!("PROOF OF PASSPORT ---- proof verified. Took: {:?}", now.elapsed());

        log::error!("PROOF OF PASSPORT ---- inputs: {:?}", inputs);

        let converted_inputs: ethereum::Inputs = inputs.into();
        let inputs_str: Vec<String> = converted_inputs.0.iter().map(|value| format!("{}", value)).collect();
        let serialized_inputs = serde_json::to_string(&inputs_str).unwrap();
        log::error!("PROOF OF PASSPORT ---- Serialized inputs: {:?}", serialized_inputs);

        let proof_str = proof_to_proof_str(&proof);
        let serialized_proof = serde_json::to_string(&proof_str).unwrap();

        log::error!("PROOF OF PASSPORT ---- Serialized proof: {:?}", serialized_proof);

        let combined = json!({
            "duration": start.elapsed().as_millis(),
            "serialized_proof": serialized_proof,
            "serialized_inputs": serialized_inputs
        });
        
        let combined_str = combined.to_string();
        let output = env.new_string(combined_str).expect("Couldn't create java string!");
    
        Ok(output.into_inner())
    }

    match run_proof(
        mrz,
        reveal_bitmap,
        data_hashes,
        e_content_bytes,
        signature,
        pubkey,
        address,
        env
    ) {
        Ok(output) => output,
        Err(_) => env.new_string("error").expect("Couldn't create java string!").into_inner(),
    }
}

fn java_arraylist_to_rust_vec(env: &JNIEnv, java_list: JObject) -> Result<Vec<String>, jni::errors::Error> {
    let size = env.call_method(java_list, "size", "()I", &[])?.i()? as i32;
    let mut vec = Vec::with_capacity(size.try_into().unwrap());

    for i in 0..size {
        let java_string = env.call_method(java_list, "get", "(I)Ljava/lang/Object;", &[JValue::from(i)])?.l()?;
        let rust_string: String = env.get_string(java_string.into())?.into();
        vec.push(rust_string);
    }

    Ok(vec)
}

#[derive(Debug)]
#[derive(Serialize)]
struct ProofStr {
    a: (String, String),
    b: ((String, String), (String, String)),
    c: (String, String),
}

fn proof_to_proof_str(proof: &Proof<Bn254>) -> ProofStr {
    let a_xy = proof.a.xy().unwrap();
    let b_xy = proof.b.xy().unwrap();
    let c_xy = proof.c.xy().unwrap();

    let b_c0_c0 = b_xy.0.c0.to_string();
    let b_c0_c1 = b_xy.0.c1.to_string();
    let b_c1_c0 = b_xy.1.c0.to_string();
    let b_c1_c1 = b_xy.1.c1.to_string();

    ProofStr {
        a: (a_xy.0.to_string(), a_xy.1.to_string()),
        b: ((b_c0_c0, b_c0_c1), (b_c1_c0, b_c1_c1)),
        c: (c_xy.0.to_string(), c_xy.1.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use ethers::{
        contract::ContractError,
        prelude::abigen,
        providers::{Http, Middleware, Provider},
        utils::Anvil,
    };
    use std::{
        error::Error,
        fs::File,
        sync::Arc,
        collections::HashMap
    };
    use ark_circom::{
        circom::CircomReduction,
        WitnessCalculator
    };
    use num_bigint::ToBigInt;

    
    // We need to implement the conversion from the Ark-Circom's internal Ethereum types to
    // the ones expected by the abigen'd types. Could we maybe provide a convenience
    // macro for these, given that there's room for implementation error?
    abigen!(Groth16Verifier, "./artifacts/verifier_artifact.json");
    use groth_16_verifier::{G1Point, G2Point, Proof as EthProof, VerifyingKey as Groth16VerifyingKey};

    impl From<ethereum::G1> for G1Point {
        fn from(src: ethereum::G1) -> Self {
            Self { x: src.x, y: src.y }
        }
    }

    impl From<ethereum::G2> for G2Point {
        fn from(src: ethereum::G2) -> Self {
            // We should use the `.as_tuple()` method which handles converting
            // the G2 elements to have the second limb first
            let src = src.as_tuple();
            Self { x: src.0, y: src.1 }
        }
    }
    impl From<ethereum::Proof> for EthProof {
        fn from(src: ethereum::Proof) -> Self {
            Self {
                a: src.a.into(),
                b: src.b.into(),
                c: src.c.into(),
            }
        }
    }
    impl From<ethereum::VerifyingKey> for Groth16VerifyingKey {
        fn from(src: ethereum::VerifyingKey) -> Self {
            Self {
                alfa_1: src.alpha1.into(),
                beta_2: src.beta2.into(),
                gamma_2: src.gamma2.into(),
                delta_2: src.delta2.into(),
                ic: src.ic.into_iter().map(|i| i.into()).collect(),
            }
        }
    }

    impl<M: Middleware> Groth16Verifier<M> {
        async fn check_proof<
            I: Into<ethereum::Inputs>,
            P: Into<ethereum::Proof>,
            VK: Into<ethereum::VerifyingKey>,
        >(
            &self,
            proof: P,
            vk: VK,
            inputs: I,
        ) -> Result<bool, ContractError<M>> {
            // convert into the expected format by the contract
            let proof = proof.into().into();
            let vk = vk.into().into();
            let inputs = inputs.into().0;
            println!("inputs in gorth16 verifier: {:?}", &inputs);

            // query the contract
            let res = self.verify(inputs, proof, vk).call().await?;

            Ok(res)
        }
    }

    #[tokio::test]
    async fn test_proof() -> Result<(), Box<dyn Error>> {
        let now = Instant::now();
        
        println!("loading zkey...");
        let path = "./passport/proof_of_passport_final.zkey";
        let mut file = File::open(path).unwrap();
        let (params, matrices) = read_zkey(&mut file).unwrap();

        println!("Circuit loaded. Took: {:?}", now.elapsed());
        let now = Instant::now();
        
        let mrz_vec: Vec<String> = vec!["97", "91", "95", "31", "88", "80", "60", "70", "82", "65", "84", "65", "86", "69", "82", "78", "73", "69", "82", "60", "60", "70", "76", "79", "82", "69", "78", "84", "60", "72", "85", "71", "85", "69", "83", "60", "74", "69", "65", "78", "60", "60", "60", "60", "60", "60", "60", "60", "60", "49", "57", "72", "65", "51", "52", "56", "50", "56", "52", "70", "82", "65", "48", "48", "48", "55", "49", "57", "49", "77", "50", "57", "49", "50", "48", "57", "53", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "48", "50"].iter().map(|&s| s.to_string()).collect();
        let reveal_bitmap_vec: Vec<String> = vec!["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "1", "1", "1", "1", "1", "1", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"].iter().map(|&s| s.to_string()).collect();
        let data_hashes_vec: Vec<String> = vec!["48", "130", "1", "37", "2", "1", "0", "48", "11", "6", "9", "96", "134", "72", "1", "101", "3", "4", "2", "1", "48", "130", "1", "17", "48", "37", "2", "1", "1", "4", "32", "99", "19", "179", "205", "55", "104", "45", "214", "133", "101", "233", "177", "130", "1", "37", "89", "125", "229", "139", "34", "132", "146", "28", "116", "248", "186", "63", "195", "96", "151", "26", "215", "48", "37", "2", "1", "2", "4", "32", "63", "234", "106", "78", "31", "16", "114", "137", "237", "17", "92", "71", "134", "47", "62", "78", "189", "233", "201", "213", "53", "4", "47", "189", "201", "133", "6", "121", "34", "131", "64", "142", "48", "37", "2", "1", "3", "4", "32", "136", "155", "87", "144", "121", "15", "152", "127", "85", "25", "154", "80", "20", "58", "51", "75", "193", "116", "234", "0", "60", "30", "29", "30", "183", "141", "72", "247", "255", "203", "100", "124", "48", "37", "2", "1", "11", "4", "32", "0", "194", "104", "108", "237", "246", "97", "230", "116", "198", "69", "110", "26", "87", "17", "89", "110", "199", "108", "250", "36", "21", "39", "87", "110", "102", "250", "213", "174", "131", "171", "174", "48", "37", "2", "1", "12", "4", "32", "190", "82", "180", "235", "222", "33", "79", "50", "152", "136", "142", "35", "116", "224", "6", "242", "156", "141", "128", "247", "10", "61", "98", "86", "248", "45", "207", "210", "90", "232", "175", "38", "48", "37", "2", "1", "13", "4", "32", "91", "222", "210", "193", "63", "222", "104", "82", "36", "41", "138", "253", "70", "15", "148", "208", "156", "45", "105", "171", "241", "195", "185", "43", "217", "162", "146", "201", "222", "89", "238", "38", "48", "37", "2", "1", "14", "4", "32", "76", "123", "216", "13", "52", "227", "72", "245", "59", "193", "238", "166", "103", "49", "24", "164", "171", "188", "194", "197", "156", "187", "249", "28", "198", "95", "69", "15", "182", "56", "54", "38"].iter().map(|&s| s.to_string()).collect();
        let e_content_bytes_vec: Vec<String> = vec!["49", "102", "48", "21", "6", "9", "42", "134", "72", "134", "247", "13", "1", "9", "3", "49", "8", "6", "6", "103", "129", "8", "1", "1", "1", "48", "28", "6", "9", "42", "134", "72", "134", "247", "13", "1", "9", "5", "49", "15", "23", "13", "49", "57", "49", "50", "49", "54", "49", "55", "50", "50", "51", "56", "90", "48", "47", "6", "9", "42", "134", "72", "134", "247", "13", "1", "9", "4", "49", "34", "4", "32", "176", "96", "59", "213", "131", "82", "89", "248", "105", "125", "37", "177", "158", "162", "137", "43", "13", "39", "115", "6", "59", "229", "81", "110", "49", "75", "255", "184", "155", "73", "116", "86"].iter().map(|&s| s.to_string()).collect();
        let signature_vec: Vec<String> = vec!["1004979219314799894", "6361443755252600907", "6439012883494616023", "9400879716815088139", "17551897985575934811", "11779273958797828281", "2536315921873401485", "3748173260178203981", "12475215309213288577", "6281117468118442715", "1336292932993922350", "14238156234566069988", "11985045093510507012", "3585865343992378960", "16170829868787473084", "17039645001628184779", "486540501180074772", "5061439412388381188", "12478821212163933993", "7430448406248319432", "746345521572597865", "5002454658692185142", "3715069341922830389", "11010599232161942094", "1577500614971981868", "13656226284809645063", "3918261659477120323", "5578832687955645075", "3416933977282345392", "15829829506526117610", "17465616637242519010", "6519177967447716150"].iter().map(|&s| s.to_string()).collect();
        let pubkey_vec: Vec<String> = vec!["9539992759301679521", "1652651398804391575", "7756096264856639170", "15028348881266521487", "13451582891670014060", "11697656644529425980", "14590137142310897374", "1172377360308996086", "6389592621616098288", "6767780215543232436", "11347756978427069433", "2593119277386338350", "18385617576997885505", "14960211320702750252", "8706817324429498800", "15168543370367053559", "8708916123725550363", "18006178692029805686", "6398208271038376723", "15000821494077560096", "17674982305626887153", "2867958270953137726", "9287774520059158342", "9813100051910281130", "13494313215150203208", "7792741716144106392", "6553490305289731807", "32268224696386820", "15737886769048580611", "669518601007982974", "11424760966478363403", "16073833083611347461"].iter().map(|&s| s.to_string()).collect();
        let address_str: String = "0xEde0fA5A7b196F512204f286666E5eC03E1005D2".to_string();
    
        fn parse_and_insert(hash_map: &mut HashMap<String, Vec<BigInt>>, key: &str, data: Vec<&str>) {
            let parsed_data: Vec<BigInt> = data.into_iter()
                .filter_map(|s| s.parse::<u128>().ok().and_then(|num| num.to_bigint()))
                .collect();
            hash_map.insert(key.to_string(), parsed_data);
        }

        let mut inputs: HashMap<String, Vec<num_bigint::BigInt>> = HashMap::new();
        parse_and_insert(&mut inputs, "mrz", mrz_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "reveal_bitmap", reveal_bitmap_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "dataHashes", data_hashes_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "eContentBytes", e_content_bytes_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "signature", signature_vec.iter().map(AsRef::as_ref).collect());
        parse_and_insert(&mut inputs, "pubkey", pubkey_vec.iter().map(AsRef::as_ref).collect());
        let address_bigint = BigInt::from_bytes_be(Sign::Plus, &decode(&address_str[2..])?);
        inputs.insert("address".to_string(), vec![address_bigint]);

        let mut rng = thread_rng();
        use ark_std::UniformRand;
        let num_inputs = matrices.num_instance_variables;
        let num_constraints = matrices.num_constraints;
        let rng = &mut rng;

        let r = ark_bn254::Fr::rand(rng);
        let s = ark_bn254::Fr::rand(rng);

        let mut wtns = WitnessCalculator::new("./passport/proof_of_passport.wasm").unwrap();
        let full_assignment = wtns
            .calculate_witness_element::<Bn254, _>(inputs, false)
            .unwrap();
        println!("witness calculated. Took: {:?}", now.elapsed());
        let now = Instant::now();

        let proof = Groth16::<Bn254, CircomReduction>::create_proof_with_reduction_and_matrices(
            &params,
            r,
            s,
            &matrices,
            num_inputs,
            num_constraints,
            full_assignment.as_slice(),
        )
        .unwrap();
        println!("proof done. Took: {:?}", now.elapsed());
        let now = Instant::now();

        let pvk = Groth16::<Bn254>::process_vk(&params.vk).unwrap();
        let inputs = &full_assignment[1..num_inputs];
        let verified = Groth16::<Bn254>::verify_with_processed_vk(&pvk, inputs, &proof).unwrap();
        println!("proof verified. Took: {:?}", now.elapsed());

        assert!(verified);

        println!("inputs: {:?}", inputs);

        let converted_inputs: ethereum::Inputs = inputs.into();
        let inputs_str: Vec<String> = converted_inputs.0.iter().map(|value| format!("{}", value)).collect();
        let serialized_inputs = serde_json::to_string(&inputs_str).unwrap();
        println!("Serialized inputs: {:?}", serialized_inputs);

        let proof_str = proof_to_proof_str(&proof);
        let serialized_proof = serde_json::to_string(&proof_str).unwrap();

        println!("Serialized proof: {:?}", serialized_proof);

        let combined = json!({
            "duration": now.elapsed().as_millis(),
            "serialized_proof": serialized_proof,
            "serialized_inputs": serialized_inputs
        });
        
        let combined_str = combined.to_string();
        println!("proof and inputs: {:?}", combined_str);

    
        // // launch the network & compile the verifier
        // println!("launching network");
        
        // let anvil = Anvil::new().spawn();
        // let acc = anvil.addresses()[0];
        // let provider = Provider::<Http>::try_from(anvil.endpoint())?;
        // let provider = provider.with_sender(acc);
        // let provider = Arc::new(provider);
        
        // // deploy the verifier
        // let contract = Groth16Verifier::deploy(provider.clone(), ())?
        // .send()
        // .await?;
    
        // println!("verifier deployed");
        // println!("contract {:?}", contract);
        // // check the proof on chain
        // let onchain_verified = contract
        // .check_proof(proof, params.vk, inputs.as_slice())
        // .await?;
    
        // println!("proof verified on chain");
        // println!("onchain_verified {:?}", onchain_verified);
    
        // assert!(onchain_verified);
    
        Ok(())
    }
}
