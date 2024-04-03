
//  Prover.swift
//  ProofOfPassport

//  Created by Florent on 13/01/2024.


import Foundation
import React
import Security
import MoproKit

#if canImport(witnesscalc_proof_of_passport)
import witnesscalc_proof_of_passport
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

struct Zkproof: Codable {
    let proof: Proof
    let pubSignals: [String]

    enum CodingKeys: String, CodingKey {
        case proof
        case pubSignals = "pub_signals"
    }
}

@available(iOS 15, *)
@objc(Prover)
class Prover: NSObject {

  let moproCircom = MoproKit.MoproCircom()
  var generatedProof: Data?
  var publicInputs: Data?

  @objc(runInitAction:reject:)
  func runInitAction(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {    // Update the textView on the main thread
    print("Initializing library")

    // Execute long-running tasks in the background
    DispatchQueue.global(qos: .userInitiated).async {
      // Record start time
      let start = CFAbsoluteTimeGetCurrent()

      do {
        try initializeMopro()

        // Record end time and compute duration
        let end = CFAbsoluteTimeGetCurrent()
        let timeTaken = end - start

        // Log the time taken for initialization
        print("Initializing arkzkey took \(timeTaken) seconds.")
        resolve("Done")
      } catch {
        // Log any errors that occurred during initialization
        print("An error occurred during initialization: \(error)")
        reject("PROVER", "An error occurred during initialization", error)
      }
    }
  }

  @objc(runProveAction:resolve:reject:)
  func runProveAction(_ inputs: [String: [String]], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    // Logic for prove (generate_proof2)
    do {
      // format of inputs, if you want to manage it manually:

      // WORKING, SAMPLE DATA:
      // let mrz: [String] = ["97","91","95","31","88","80","60","70","82","65","68","85","80","79","78","84","60","60","65","76","80","72","79","78","83","69","60","72","85","71","85","69","83","60","65","76","66","69","82","84","60","60","60","60","60","60","60","60","60","50","52","72","66","56","49","56","51","50","52","70","82","65","48","52","48","50","49","49","49","77","51","49","49","49","49","49","53","60","60","60","60","60","60","60","60","60","60","60","60","60","60","48","50"]
      // let reveal_bitmap: [String] = ["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"]
      // let dataHashes: [String] = ["48","130","1","37","2","1","0","48","11","6","9","96","134","72","1","101","3","4","2","1","48","130","1","17","48","37","2","1","1","4","32","176","223","31","133","108","84","158","102","70","11","165","175","196","12","201","130","25","131","46","125","156","194","28","23","55","133","157","164","135","136","220","78","48","37","2","1","2","4","32","190","82","180","235","222","33","79","50","152","136","142","35","116","224","6","242","156","141","128","248","10","61","98","86","248","45","207","210","90","232","175","38","48","37","2","1","3","4","32","0","194","104","108","237","246","97","230","116","198","69","110","26","87","17","89","110","199","108","250","36","21","39","87","110","102","250","213","174","131","171","174","48","37","2","1","11","4","32","136","155","87","144","111","15","152","127","85","25","154","81","20","58","51","75","193","116","234","0","60","30","29","30","183","141","72","247","255","203","100","124","48","37","2","1","12","4","32","41","234","106","78","31","11","114","137","237","17","92","71","134","47","62","78","189","233","201","214","53","4","47","189","201","133","6","121","34","131","64","142","48","37","2","1","13","4","32","91","222","210","193","62","222","104","82","36","41","138","253","70","15","148","208","156","45","105","171","241","195","185","43","217","162","146","201","222","89","238","38","48","37","2","1","14","4","32","76","123","216","13","51","227","72","245","59","193","238","166","103","49","23","164","171","188","194","197","156","187","249","28","198","95","69","15","182","56","54","38"]
      // let eContentBytes: [String] = ["49","102","48","21","6","9","42","134","72","134","247","13","1","9","3","49","8","6","6","103","129","8","1","1","1","48","28","6","9","42","134","72","134","247","13","1","9","5","49","15","23","13","49","57","49","50","49","54","49","55","50","50","51","56","90","48","47","6","9","42","134","72","134","247","13","1","9","4","49","34","4","32","32","85","108","174","127","112","178","182","8","43","134","123","192","211","131","66","184","240","212","181","240","180","106","195","24","117","54","129","19","10","250","53"]
      // let signature: [String] = ["7924608050410952186","18020331358710788578","8570093713362871693","158124167841380627","11368970785933558334","13741644704804016484","3255497432248429697","18325134696633464276","11159517223698754974","14221210644107127310","18395843719389189885","14516795783073238806","2008163829408627473","10489977208787195755","11349558951945231290","10261182129521943851","898517390497363184","7991226362010359134","16695870541274258886","3471091665352332245","9966265751297511656","15030994431171601215","10723494832064770597","14939163534927288303","13596611050508022203","12058746125656824488","7806259275107295093","9171418878976478189","16438005721800053020","315207309308375554","3950355816720285857","5415176625244763446"]
      // let pubkey: [String] = ["10501872816920780427","9734403015003984321","14411195268255541454","5140370262757446136","442944543003039303","2084906169692591819","13619051978156646232","11308439966240653768","11784026229075891869","3619707049269329199","14678094225574041482","13372281921787791985","5760458619375959191","1351001273751492154","9127780359628047919","5377643070972775368","14145972494784958946","295160036043261024","12244573192558293296","13273111070076476096","15787778596745267629","12026125372525341435","17186889501189543072","1678833675164196298","11525741336698300342","9004411014119053043","3653149686233893817","3525782291631180893","13397424121878903415","12208454420188007950","5024240771370648155","15842149209258762075"]
      // let address: [String] = ["897585614395172552642670145532424661022951192962"] // decimal of 0x9D392187c08fc28A86e1354aD63C70897165b982

      // var inputs = [String: [String]]()
      // inputs["mrz"] = mrz;
      // inputs["reveal_bitmap"] = reveal_bitmap;
      // inputs["dataHashes"] = dataHashes;
      // inputs["eContentBytes"] = eContentBytes;
      // inputs["signature"] = signature;
      // inputs["pubkey"] = pubkey;
      // inputs["address"] = address;

      
      let inputsMul = try! JSONEncoder().encode(inputs)
      print("inputsMul size: \(inputsMul.count) bytes")
      print("inputsMul data: \(String(data: inputsMul, encoding: .utf8) ?? "")")
      
      let start = CFAbsoluteTimeGetCurrent()

      let wtns = try! calcWtnsAuthV2(inputsJson: inputsMul)
      print("wtns size: \(wtns.count) bytes")
      // print("wtns data (hex): \(wtns.map { String(format: "%02hhx", $0) }.joined())")

      let (proofRaw, pubSignalsRaw) = try groth16AuthV2(wtns: wtns)
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
      print("Proof Object: \(proofObjectString)")
      resolve(proofObjectString)
    } catch {
      print("Unexpected error: \(error)")
      reject("PROVER", "An error occurred during proof generation", error)
    }
  }

}

public func calcWtnsAuthV2(inputsJson: Data) throws -> Data {
    let dat = NSDataAsset(name: "proof_of_passport.dat")!.data
    return try _calcWtnsAuthV2(dat: dat, jsonData: inputsJson)
}

enum WitnessCalculationError: Error {
    case error(String)
    case shortBuffer(requiredSize: UInt)
}

private func _calcWtnsAuthV2(dat: Data, jsonData: Data) throws -> Data {
    let datSize = UInt(dat.count)
    let jsonDataSize = UInt(jsonData.count)

    let errorSize = UInt(256);
    
    let wtnsSize = UnsafeMutablePointer<UInt>.allocate(capacity: Int(1));
    wtnsSize.initialize(to: UInt(100 * 1024 * 1024 ))
    
    let wtnsBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: (100 * 1024 * 1024))
    let errorBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: Int(errorSize))
    
    let result = witnesscalc_proof_of_passport(
        (dat as NSData).bytes, datSize,
        (jsonData as NSData).bytes, jsonDataSize,
        wtnsBuffer, wtnsSize,
        errorBuffer, errorSize
    )
    
    if result == WITNESSCALC_ERROR {
        let errorMessage = String(bytes: Data(bytes: errorBuffer, count: Int(errorSize)), encoding: .utf8)!
            .replacingOccurrences(of: "\0", with: "")
        throw WitnessCalculationError.error(errorMessage)
    }

    if result == WITNESSCALC_ERROR_SHORT_BUFFER {
        throw WitnessCalculationError.shortBuffer(requiredSize: wtnsSize.pointee)
    }
    
    return Data(bytes: wtnsBuffer, count: Int(wtnsSize.pointee))
}


public func groth16AuthV2(wtns: Data) throws -> (proof: Data, publicInputs: Data) {
    return try _groth16Prover(zkey: NSDataAsset(name: "proof_of_passport.zkey")!.data, wtns: wtns)
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