use ark_circom::{ethereum, CircomBuilder, CircomConfig};
use ark_std::rand::thread_rng;
use color_eyre::Result;
use std::os::raw::c_int;

use ark_bn254::Bn254;
use ark_crypto_primitives::snark::SNARK;
use ark_groth16::{Groth16, Proof};
use ark_ec::AffineRepr;

use num_bigint::{BigInt, Sign};
extern crate hex;
use hex::decode;

use std::time::Instant;
use std::convert::TryInto;

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


#[no_mangle]
pub extern "C" fn Java_io_tradle_nfc_RNPassportReaderModule_callRustCode(
    env: JNIEnv,
    _: JClass,
) -> jstring {
    android_logger::init_once(Config::default().with_min_level(Level::Trace));
    log::error!("log before imports");

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
    
    log::error!("formatting inputsaaaa...");
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

        log::error!("formatting inputs...");
        log::error!("mrz_veccccccc");
        
        let mrz_vec: Vec<String> = java_arraylist_to_rust_vec(&env, mrz)?;
        let reveal_bitmap_vec: Vec<String> = java_arraylist_to_rust_vec(&env, reveal_bitmap)?;
        let data_hashes_vec: Vec<String> = java_arraylist_to_rust_vec(&env, data_hashes)?;
        let e_content_bytes_vec: Vec<String> = java_arraylist_to_rust_vec(&env, e_content_bytes)?;
        let signature_vec: Vec<String> = java_arraylist_to_rust_vec(&env, signature)?;
        let pubkey_vec: Vec<String> = java_arraylist_to_rust_vec(&env, pubkey)?;
        let address_str: String = env.get_string(address)?.into();

        log::error!("mrz_vec {:?}", mrz_vec);
        log::error!("reveal_bitmap_vec {:?}", reveal_bitmap_vec);
        log::error!("data_hashes_vec {:?}", data_hashes_vec);
        log::error!("e_content_bytes_vec {:?}", e_content_bytes_vec);
        log::error!("signature_vec {:?}", signature_vec);
        log::error!("pubkey_vec {:?}", pubkey_vec);
        log::error!("address_str {:?}", address_str);
        
        log::error!("loading circuit...");
        const MAIN_WASM: &'static [u8] = include_bytes!("../passport/proof_of_passport.wasm");
        const MAIN_R1CS: &'static [u8] = include_bytes!("../passport/proof_of_passport.r1cs");
        log::error!("circuit loaded");
        
        let cfg = CircomConfig::<Bn254>::from_bytes(MAIN_WASM, MAIN_R1CS)?;

        let mut builder = CircomBuilder::new(cfg);

        mrz_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("mrz", n));
        reveal_bitmap_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("reveal_bitmap", n));
        data_hashes_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("dataHashes", n));
        e_content_bytes_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("eContentBytes", n));
        signature_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("signature", n));
        pubkey_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("pubkey", n));

        let address_bigint = BigInt::from_bytes_be(Sign::Plus, &decode(&address_str[2..])?);
        builder.push_input("address", address_bigint);

        // create an empty instance for setting it up
        let circom = builder.setup();
        
        let mut rng = thread_rng();
        let params = GrothBn::generate_random_parameters_with_reduction(circom, &mut rng)?;
        
        let circom = builder.build()?;
        log::error!("circuit built");
        
        let inputs = circom.get_public_inputs().unwrap();
        log::error!("inputs: {:?}", inputs);

        let converted_inputs: ethereum::Inputs = inputs.as_slice().into();
        let inputs_str: Vec<String> = converted_inputs.0.iter().map(|value| format!("{}", value)).collect();
        let serialized_inputs = serde_json::to_string(&inputs_str).unwrap();
        log::error!("Serialized inputs: {:?}", serialized_inputs);

        let start1 = Instant::now();
        
        let proof = GrothBn::prove(&params, circom, &mut rng)?;
        
        let proof_str = proof_to_proof_str(&proof);
        let serialized_proof = serde_json::to_string(&proof_str).unwrap();

        let duration1 = start1.elapsed();
        log::error!("proof generated. Took: {:?}", duration1);
        
        let start2 = Instant::now();

        let pvk = GrothBn::process_vk(&params.vk).unwrap();
        
        let verified = GrothBn::verify_with_processed_vk(&pvk, &inputs, &proof)?;
        let duration2 = start2.elapsed();
        log::error!("proof verified. Took: {:?}", duration2);

        assert!(verified);

        let combined = json!({
            "duration": duration1.as_millis(),
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
    use std::{error::Error, sync::Arc};


    // We need to implement the conversion from the Ark-Circom's internal Ethereum types to
    // the ones expected by the abigen'd types. Could we maybe provide a convenience
    // macro for these, given that there's room for implementation error?
    abigen!(Groth16Verifier, "./artifacts/verifier_artifact.json");
    use groth_16_verifier::{G1Point, G2Point, Proof as EthProof, VerifyingKey};

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
    impl From<ethereum::VerifyingKey> for VerifyingKey {
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
        let mut start = Instant::now();

        println!("loading circuit...");
        const MAIN_WASM: &'static [u8] = include_bytes!("../passport/proof_of_passport.wasm");
        const MAIN_R1CS: &'static [u8] = include_bytes!("../passport/proof_of_passport.r1cs");
        let cfg = CircomConfig::<Bn254>::from_bytes(MAIN_WASM, MAIN_R1CS)?;
        // let cfg = CircomConfig::<Bn254>::new(
        //     "./passport/proof_of_passport.wasm",
        //     "./passport/proof_of_passport.r1cs",
        // )?;
        // println!("circuit loaded");
        let duration = start.elapsed();
        println!("Circuit loaded. Took: {:?}", duration);

        start = Instant::now();    
        let mut builder = CircomBuilder::new(cfg,);
        let mrz_vec: Vec<String> = vec!["97", "91", "95", "31", "88", "80", "60", "70", "82", "65", "84", "65", "86", "69", "82", "78", "73", "69", "82", "60", "60", "70", "76", "79", "82", "69", "78", "84", "60", "72", "85", "71", "85", "69", "83", "60", "74", "69", "65", "78", "60", "60", "60", "60", "60", "60", "60", "60", "60", "49", "57", "72", "65", "51", "52", "56", "50", "56", "52", "70", "82", "65", "48", "48", "48", "55", "49", "57", "49", "77", "50", "57", "49", "50", "48", "57", "53", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "60", "48", "50"].iter().map(|&s| s.to_string()).collect();
        let reveal_bitmap_vec: Vec<String> = vec!["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "1", "1", "1", "1", "1", "1", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"].iter().map(|&s| s.to_string()).collect();
        let data_hashes_vec: Vec<String> = vec!["48", "130", "1", "37", "2", "1", "0", "48", "11", "6", "9", "96", "134", "72", "1", "101", "3", "4", "2", "1", "48", "130", "1", "17", "48", "37", "2", "1", "1", "4", "32", "99", "19", "179", "205", "55", "104", "45", "214", "133", "101", "233", "177", "130", "1", "37", "89", "125", "229", "139", "34", "132", "146", "28", "116", "248", "186", "63", "195", "96", "151", "26", "215", "48", "37", "2", "1", "2", "4", "32", "63", "234", "106", "78", "31", "16", "114", "137", "237", "17", "92", "71", "134", "47", "62", "78", "189", "233", "201", "213", "53", "4", "47", "189", "201", "133", "6", "121", "34", "131", "64", "142", "48", "37", "2", "1", "3", "4", "32", "136", "155", "87", "144", "121", "15", "152", "127", "85", "25", "154", "80", "20", "58", "51", "75", "193", "116", "234", "0", "60", "30", "29", "30", "183", "141", "72", "247", "255", "203", "100", "124", "48", "37", "2", "1", "11", "4", "32", "0", "194", "104", "108", "237", "246", "97", "230", "116", "198", "69", "110", "26", "87", "17", "89", "110", "199", "108", "250", "36", "21", "39", "87", "110", "102", "250", "213", "174", "131", "171", "174", "48", "37", "2", "1", "12", "4", "32", "190", "82", "180", "235", "222", "33", "79", "50", "152", "136", "142", "35", "116", "224", "6", "242", "156", "141", "128", "247", "10", "61", "98", "86", "248", "45", "207", "210", "90", "232", "175", "38", "48", "37", "2", "1", "13", "4", "32", "91", "222", "210", "193", "63", "222", "104", "82", "36", "41", "138", "253", "70", "15", "148", "208", "156", "45", "105", "171", "241", "195", "185", "43", "217", "162", "146", "201", "222", "89", "238", "38", "48", "37", "2", "1", "14", "4", "32", "76", "123", "216", "13", "52", "227", "72", "245", "59", "193", "238", "166", "103", "49", "24", "164", "171", "188", "194", "197", "156", "187", "249", "28", "198", "95", "69", "15", "182", "56", "54", "38"].iter().map(|&s| s.to_string()).collect();
        let e_content_bytes_vec: Vec<String> = vec!["49", "102", "48", "21", "6", "9", "42", "134", "72", "134", "247", "13", "1", "9", "3", "49", "8", "6", "6", "103", "129", "8", "1", "1", "1", "48", "28", "6", "9", "42", "134", "72", "134", "247", "13", "1", "9", "5", "49", "15", "23", "13", "49", "57", "49", "50", "49", "54", "49", "55", "50", "50", "51", "56", "90", "48", "47", "6", "9", "42", "134", "72", "134", "247", "13", "1", "9", "4", "49", "34", "4", "32", "176", "96", "59", "213", "131", "82", "89", "248", "105", "125", "37", "177", "158", "162", "137", "43", "13", "39", "115", "6", "59", "229", "81", "110", "49", "75", "255", "184", "155", "73", "116", "86"].iter().map(|&s| s.to_string()).collect();
        let signature_vec: Vec<String> = vec!["1004979219314799894", "6361443755252600907", "6439012883494616023", "9400879716815088139", "17551897985575934811", "11779273958797828281", "2536315921873401485", "3748173260178203981", "12475215309213288577", "6281117468118442715", "1336292932993922350", "14238156234566069988", "11985045093510507012", "3585865343992378960", "16170829868787473084", "17039645001628184779", "486540501180074772", "5061439412388381188", "12478821212163933993", "7430448406248319432", "746345521572597865", "5002454658692185142", "3715069341922830389", "11010599232161942094", "1577500614971981868", "13656226284809645063", "3918261659477120323", "5578832687955645075", "3416933977282345392", "15829829506526117610", "17465616637242519010", "6519177967447716150"].iter().map(|&s| s.to_string()).collect();
        let pubkey_vec: Vec<String> = vec!["9539992759301679521", "1652651398804391575", "7756096264856639170", "15028348881266521487", "13451582891670014060", "11697656644529425980", "14590137142310897374", "1172377360308996086", "6389592621616098288", "6767780215543232436", "11347756978427069433", "2593119277386338350", "18385617576997885505", "14960211320702750252", "8706817324429498800", "15168543370367053559", "8708916123725550363", "18006178692029805686", "6398208271038376723", "15000821494077560096", "17674982305626887153", "2867958270953137726", "9287774520059158342", "9813100051910281130", "13494313215150203208", "7792741716144106392", "6553490305289731807", "32268224696386820", "15737886769048580611", "669518601007982974", "11424760966478363403", "16073833083611347461"].iter().map(|&s| s.to_string()).collect();
        let address_str: String = "0xEde0fA5A7b196F512204f286666E5eC03E1005D2".to_string();
    
        mrz_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("mrz", n));
        reveal_bitmap_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("reveal_bitmap", n));
        data_hashes_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("dataHashes", n));
        e_content_bytes_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("eContentBytes", n));
        signature_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("signature", n));
        pubkey_vec.iter()
            .filter_map(|s| s.parse::<u128>().ok())
            .for_each(|n| builder.push_input("pubkey", n));
    
        let address_bigint = BigInt::from_bytes_be(Sign::Plus, &decode(&address_str[2..])?);
        builder.push_input("address", address_bigint);
    
        // create an empty instance for setting it up
        let circom = builder.setup();
        
        let mut rng = thread_rng();
        let params = GrothBn::generate_random_parameters_with_reduction(circom, &mut rng)?;
        
        let circom = builder.build()?;
        log::error!("circuit built");

        let duration = start.elapsed();
        println!("builder.build took: {:?}", duration);

        let inputs = circom.get_public_inputs().unwrap();
        log::error!("inputs: {:?}", inputs);
        
        let converted_inputs: ethereum::Inputs = inputs.as_slice().into();
        let inputs_str: Vec<String> = converted_inputs.0.iter().map(|value| format!("{}", value)).collect();
        let serialized_inputs = serde_json::to_string(&inputs_str).unwrap();
        log::error!("Serialized inputs: {:?}", serialized_inputs);
        
        start = Instant::now();
        let proof = GrothBn::prove(&params, circom, &mut rng)?;
        println!("proof: {:?}", proof);
    
        let proof_str = proof_to_proof_str(&proof);
        println!("proof_str: {:?}", proof_str);

        let duration = start.elapsed();
        println!("Proof done. Took: {:?}", duration);
        start = Instant::now();
        
        let pvk = GrothBn::process_vk(&params.vk).unwrap();
        let verified = GrothBn::verify_with_processed_vk(&pvk, &inputs, &proof)?;
        let duration = start.elapsed();
        println!("Proof verified. Took: {:?}", duration);
    
        assert!(verified);
    
        // launch the network & compile the verifier
        println!("launching network");
        
        let anvil = Anvil::new().spawn();
        let acc = anvil.addresses()[0];
        let provider = Provider::<Http>::try_from(anvil.endpoint())?;
        let provider = provider.with_sender(acc);
        let provider = Arc::new(provider);
        
        // deploy the verifier
        let contract = Groth16Verifier::deploy(provider.clone(), ())?
        .send()
        .await?;
    
        println!("verifier deployed");
        println!("contract {:?}", contract);
        // check the proof on chain
        let onchain_verified = contract
        .check_proof(proof, params.vk, inputs.as_slice())
        .await?;
    
        println!("proof verified on chain");
        println!("onchain_verified {:?}", onchain_verified);
    
        assert!(onchain_verified);
    
        Ok(())
    }
}
