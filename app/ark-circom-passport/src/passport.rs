use ark_circom::{ethereum, CircomBuilder, CircomConfig};
use ark_std::rand::thread_rng;
use color_eyre::Result;
use std::os::raw::c_int;

use ark_bn254::Bn254;
use ark_crypto_primitives::snark::SNARK;
use ark_groth16::{Groth16, Proof};
// use ark_ff::QuadExtField;
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

// -message:"BpfCoordinator"  -message:"MATCH" -message:"maximum"  -message:"exception" level:WARN

#[derive(Debug)]
#[derive(Serialize)]
struct ProofStr {
    a: (String, String),
    b: ((String, String), (String, String)), // Represent each QuadExtField by two BaseFields
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
