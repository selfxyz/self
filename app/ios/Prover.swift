
//  Prover.swift
//  OpenPassport

//  Created by Florent on 13/01/2024.


import Foundation
import React
import Security

// #if canImport(witnesscalc_register_sha256WithRSAEncryption_65537)
// import witnesscalc_register_sha256WithRSAEncryption_65537
// #endif

// #if canImport(witnesscalc_disclose)
// import witnesscalc_disclose
// #endif

#if canImport(witnesscalc_prove_rsa_65537_sha256)
import witnesscalc_prove_rsa_65537_sha256
#endif

#if canImport(witnesscalc_prove_rsa_65537_sha1)
import witnesscalc_prove_rsa_65537_sha1
#endif

#if canImport(witnesscalc_prove_rsapss_65537_sha256)
import witnesscalc_prove_rsapss_65537_sha256
#endif

#if canImport(witnesscalc_register_rsa_65537_sha256)
import witnesscalc_register_rsa_65537_sha256
#endif

#if canImport(witnesscalc_register_rsa_65537_sha1)
import witnesscalc_register_rsa_65537_sha1
#endif

#if canImport(witnesscalc_register_rsapss_65537_sha256)
import witnesscalc_register_rsapss_65537_sha256
#endif

#if canImport(witnesscalc_vc_and_disclose)
import witnesscalc_vc_and_disclose
#endif

#if canImport(groth16_prover)
import groth16_prover
#endif

struct Proof: Codable {
    let piA: [String]
    let piB: [[String]]
    let piC: [String]
    let proofProtocol: String

    enum CodingKeys: String, CodingKey {
        case piA = "pi_a"
        case piB = "pi_b"
        case piC = "pi_c"
        case proofProtocol = "protocol"
    }
}

@available(iOS 15, *)
@objc(Prover)
class Prover: NSObject {
    @objc(runProveAction:witness_calculator:dat_file_path:inputs:resolve:reject:)
    func runProveAction(_ zkey_path: String, witness_calculator: String, dat_file_path: String, inputs: [String: [String]], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let inputsJson = try! JSONEncoder().encode(inputs)
            print("inputs size: \(inputsJson.count) bytes")
            print("inputs data: \(String(data: inputsJson, encoding: .utf8) ?? "")")
            
            let wtns = try! calcWtns(
                witness_calculator: witness_calculator,
                dat_file_path: dat_file_path,
                inputsJson: inputsJson
            )
            print("wtns size: \(wtns.count) bytes")

            let (proofRaw, pubSignalsRaw) = try groth16prove(zkey_path: zkey_path, wtns: wtns)
            let proof = try JSONDecoder().decode(Proof.self, from: proofRaw)
            let pubSignals = try JSONDecoder().decode([String].self, from: pubSignalsRaw)

            let proofObject: [String: Any] = [
                "proof": [
                "a": proof.piA,
                "b": proof.piB,
                "c": proof.piC,
                ],
                "inputs": pubSignals
            ]

            let proofData = try JSONSerialization.data(withJSONObject: proofObject, options: [])
            let proofObjectString = String(data: proofData, encoding: .utf8) ?? ""
            print("Whole proof: \(proofObjectString)")
            resolve(proofObjectString)
        } catch {
            print("Unexpected error: \(error)")
            reject("PROVER", "An error occurred during proof generation", error)
        }
    }
}

public func calcWtns(witness_calculator: String, dat_file_path: String, inputsJson: Data) throws -> Data {
    guard let datURL = URL(string: "file://" + dat_file_path) else {
        throw NSError(domain: "YourErrorDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid dat file path."])
    }
    
    guard let dat = try? Data(contentsOf: datURL) else {
        throw NSError(domain: "YourErrorDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to load dat file."])
    }
    
    return try _calcWtns(witness_calculator: witness_calculator, dat: dat, jsonData: inputsJson)
}

private func _calcWtns(witness_calculator: String, dat: Data, jsonData: Data) throws -> Data {
    let datSize = UInt(dat.count)
    let jsonDataSize = UInt(jsonData.count)

    let errorSize = UInt(256);
    
    let wtnsSize = UnsafeMutablePointer<UInt>.allocate(capacity: Int(1));
    wtnsSize.initialize(to: UInt(100 * 1024 * 1024 ))
    
    let wtnsBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: (100 * 1024 * 1024))
    let errorBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: Int(errorSize))
    
    let result: Int32
    
    // if witness_calculator == "register_sha256WithRSAEncryption_65537" {
    //     result = witnesscalc_register_sha256WithRSAEncryption_65537(
    //         (dat as NSData).bytes, datSize,
    //         (jsonData as NSData).bytes, jsonDataSize,
    //         wtnsBuffer, wtnsSize,
    //         errorBuffer, errorSize
    //     )
    // } else if witness_calculator == "disclose" {
    //     result = witnesscalc_disclose(
    //         (dat as NSData).bytes, datSize,
    //         (jsonData as NSData).bytes, jsonDataSize,
    //         wtnsBuffer, wtnsSize,
    //         errorBuffer, errorSize
    //     )
    // } else
    if witness_calculator == "prove_rsa_65537_sha256" {
        result = witnesscalc_prove_rsa_65537_sha256(
            (dat as NSData).bytes, datSize,
            (jsonData as NSData).bytes, jsonDataSize,
            wtnsBuffer, wtnsSize,
            errorBuffer, errorSize
        )
    } else if witness_calculator == "prove_rsa_65537_sha1" {
        result = witnesscalc_prove_rsa_65537_sha1(
            (dat as NSData).bytes, datSize,
            (jsonData as NSData).bytes, jsonDataSize,
            wtnsBuffer, wtnsSize,
            errorBuffer, errorSize
        )
    } else if witness_calculator == "prove_rsapss_65537_sha256" {
        result = witnesscalc_prove_rsapss_65537_sha256(
            (dat as NSData).bytes, datSize,
            (jsonData as NSData).bytes, jsonDataSize,
            wtnsBuffer, wtnsSize,
            errorBuffer, errorSize
        )
    } else if witness_calculator == "register_rsa_65537_sha256" {
        result = witnesscalc_register_rsa_65537_sha256(
            (dat as NSData).bytes, datSize,
            (jsonData as NSData).bytes, jsonDataSize,
            wtnsBuffer, wtnsSize,
            errorBuffer, errorSize
        )
    } else if witness_calculator == "register_rsa_65537_sha1" {
        result = witnesscalc_register_rsa_65537_sha1(
            (dat as NSData).bytes, datSize,
            (jsonData as NSData).bytes, jsonDataSize,
            wtnsBuffer, wtnsSize,
            errorBuffer, errorSize
        )
    } else if witness_calculator == "register_rsapss_65537_sha256" {
        result = witnesscalc_register_rsapss_65537_sha256(
            (dat as NSData).bytes, datSize,
            (jsonData as NSData).bytes, jsonDataSize,
            wtnsBuffer, wtnsSize,
            errorBuffer, errorSize
        )
    } else if witness_calculator == "vc_and_disclose" { 
        result = witnesscalc_vc_and_disclose(
            (dat as NSData).bytes, datSize,
            (jsonData as NSData).bytes, jsonDataSize,
            wtnsBuffer, wtnsSize,
            errorBuffer, errorSize
        )
    } else {
        fatalError("Invalid witness calculator name")
    }
    
    if result == WITNESSCALC_ERROR {
        let errorMessage = String(bytes: Data(bytes: errorBuffer, count: Int(errorSize)), encoding: .utf8)!
        .replacingOccurrences(of: "\0", with: "")
        throw NSError(domain: "WitnessCalculationError", code: Int(WITNESSCALC_ERROR), userInfo: [NSLocalizedDescriptionKey: errorMessage])
    }

    if result == WITNESSCALC_ERROR_SHORT_BUFFER {
        let shortBufferMessage = "Short buffer, required size: \(wtnsSize.pointee)"
        throw NSError(domain: "WitnessCalculationError", code: Int(WITNESSCALC_ERROR_SHORT_BUFFER), userInfo: [NSLocalizedDescriptionKey: shortBufferMessage])
    }
    return Data(bytes: wtnsBuffer, count: Int(wtnsSize.pointee))
}

public func groth16prove(zkey_path: String, wtns: Data) throws -> (proof: Data, publicInputs: Data) {
    guard let zkeyURL = URL(string: "file://" + zkey_path) else {
        throw NSError(domain: "YourErrorDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid zkey file path."])
    }
    print("zkeyURL: \(zkeyURL)")

    guard let zkeyData = try? Data(contentsOf: zkeyURL) else {
        throw NSError(domain: "YourErrorDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to load zkey file."])
    }
    
    return try _groth16Prover(zkey: zkeyData, wtns: wtns)
}

public func _groth16Prover(zkey: Data, wtns: Data) throws -> (proof: Data, publicInputs: Data) {
    let zkeySize = zkey.count
    let wtnsSize = wtns.count
    
    var proofSize: UInt = 4 * 1024 * 1024
    var publicSize: UInt = 4 * 1024 * 1024
    
    let proofBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: Int(proofSize))
    let publicBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: Int(publicSize))
    
    let errorBuffer = UnsafeMutablePointer<Int8>.allocate(capacity: 256)
    let errorMaxSize: UInt = 256
    
    let result = groth16_prover(
        (zkey as NSData).bytes, UInt(zkeySize),
        (wtns as NSData).bytes, UInt(wtnsSize),
        proofBuffer, &proofSize,
        publicBuffer, &publicSize,
        errorBuffer, errorMaxSize
    )
    if result == PROVER_ERROR {
        let errorMessage = String(bytes: Data(bytes: errorBuffer, count: Int(errorMaxSize)), encoding: .utf8)!
        .replacingOccurrences(of: "\0", with: "")
        throw NSError(domain: "", code: Int(result), userInfo: [NSLocalizedDescriptionKey: errorMessage])
    }
    
    if result == PROVER_ERROR_SHORT_BUFFER {
        let shortBufferMessage = "Proof or public inputs buffer is too short"
        throw NSError(domain: "", code: Int(result), userInfo: [NSLocalizedDescriptionKey: shortBufferMessage])
    }
    var proof = Data(bytes: proofBuffer, count: Int(proofSize))
    var publicInputs = Data(bytes: publicBuffer, count: Int(publicSize))
    
    let proofNullIndex = proof.firstIndex(of: 0x00)!
    let publicInputsNullIndex = publicInputs.firstIndex(of: 0x00)!
    
    proof = proof[0..<proofNullIndex]
    publicInputs = publicInputs[0..<publicInputsNullIndex]
    
    return (proof: proof, publicInputs: publicInputs)
}
