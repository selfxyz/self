//
//  ViewController.swift
//  MoproKit
//
//  Created by 1552237 on 09/16/2023.
//  Copyright (c) 2023 1552237. All rights reserved.
//

import UIKit
import MoproKit

class RSAViewController: UIViewController {

    var initButton = UIButton(type: .system)
    var proveButton = UIButton(type: .system)
    var verifyButton = UIButton(type: .system)
    var textView = UITextView()

    let moproCircom = MoproKit.MoproCircom()
    //var setupResult: SetupResult?
    var generatedProof: Data?
    var publicInputs: Data?

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set title
        let title = UILabel()
        title.text = "RSA (Zkey)"
        title.textColor = .white
        title.textAlignment = .center
        navigationItem.titleView = title
        navigationController?.navigationBar.isHidden = false
        navigationController?.navigationBar.prefersLargeTitles = true

        setupUI()
    }

   func setupUI() {
        initButton.setTitle("Init", for: .normal)
        proveButton.setTitle("Prove", for: .normal)
        verifyButton.setTitle("Verify", for: .normal)

        // Uncomment once init separate
        //proveButton.isEnabled = false
        proveButton.isEnabled = true
        verifyButton.isEnabled = false
        textView.isEditable = false

        // Setup actions for buttons
        initButton.addTarget(self, action: #selector(runInitAction), for: .touchUpInside)
        proveButton.addTarget(self, action: #selector(runProveAction), for: .touchUpInside)
        verifyButton.addTarget(self, action: #selector(runVerifyAction), for: .touchUpInside)

       initButton.contentEdgeInsets = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
       proveButton.contentEdgeInsets = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
       verifyButton.contentEdgeInsets = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)

        let stackView = UIStackView(arrangedSubviews: [initButton, proveButton, verifyButton, textView])
        stackView.axis = .vertical
        stackView.spacing = 10
        stackView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stackView)

        // Make text view visible
        textView.heightAnchor.constraint(equalToConstant: 200).isActive = true

        NSLayoutConstraint.activate([
            stackView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20)
        ])
    }

    @objc func runInitAction() {
        // Update the textView on the main thread
        DispatchQueue.main.async {
            self.textView.text += "Initializing library\n"
        }

        // Execute long-running tasks in the background
        DispatchQueue.global(qos: .userInitiated).async {
            // Record start time
            let start = CFAbsoluteTimeGetCurrent()

            do {
                try initializeMopro()

                // Record end time and compute duration
                let end = CFAbsoluteTimeGetCurrent()
                let timeTaken = end - start

                // Again, update the UI on the main thread
                DispatchQueue.main.async {
                    self.textView.text += "Initializing arkzkey took \(timeTaken) seconds.\n"
                }
            } catch {
                // Handle errors - update UI on main thread
                DispatchQueue.main.async {
                    self.textView.text += "An error occurred during initialization: \(error)\n"
                }
            }
        }
    }

    @objc func runProveAction() {
        // Logic for prove (generate_proof2)
        do {
            // Prepare inputs
            let signature: [String] = [
            "3582320600048169363",
            "7163546589759624213",
            "18262551396327275695",
            "4479772254206047016",
            "1970274621151677644",
            "6547632513799968987",
            "921117808165172908",
            "7155116889028933260",
            "16769940396381196125",
            "17141182191056257954",
            "4376997046052607007",
            "17471823348423771450",
            "16282311012391954891",
            "70286524413490741",
            "1588836847166444745",
            "15693430141227594668",
            "13832254169115286697",
            "15936550641925323613",
            "323842208142565220",
            "6558662646882345749",
            "15268061661646212265",
            "14962976685717212593",
            "15773505053543368901",
            "9586594741348111792",
            "1455720481014374292",
            "13945813312010515080",
            "6352059456732816887",
            "17556873002865047035",
            "2412591065060484384",
            "11512123092407778330",
            "8499281165724578877",
            "12768005853882726493",
            ]

            let modulus: [String] = [
            "13792647154200341559",
            "12773492180790982043",
            "13046321649363433702",
            "10174370803876824128",
            "7282572246071034406",
            "1524365412687682781",
            "4900829043004737418",
            "6195884386932410966",
            "13554217876979843574",
            "17902692039595931737",
            "12433028734895890975",
            "15971442058448435996",
            "4591894758077129763",
            "11258250015882429548",
            "16399550288873254981",
            "8246389845141771315",
            "14040203746442788850",
            "7283856864330834987",
            "12297563098718697441",
            "13560928146585163504",
            "7380926829734048483",
            "14591299561622291080",
            "8439722381984777599",
            "17375431987296514829",
            "16727607878674407272",
            "3233954801381564296",
            "17255435698225160983",
            "15093748890170255670",
            "15810389980847260072",
            "11120056430439037392",
            "5866130971823719482",
            "13327552690270163501",
            ]

            let base_message: [String] = ["18114495772705111902", "2254271930739856077",
            "2068851770", "0","0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0",
            "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0","0", "0", "0","0",
            ]

            var inputs = [String: [String]]()
            inputs["signature"] = signature;
            inputs["modulus"] = modulus;
            inputs["base_message"] = base_message;

            let start = CFAbsoluteTimeGetCurrent()

            // Generate Proof
            let generateProofResult = try generateProof2(circuitInputs: inputs)
            assert(!generateProofResult.proof.isEmpty, "Proof should not be empty")

            // Record end time and compute duration
            let end = CFAbsoluteTimeGetCurrent()
            let timeTaken = end - start

            // Store the generated proof and public inputs for later verification
            generatedProof = generateProofResult.proof
            publicInputs = generateProofResult.inputs

            textView.text += "Proof generation took \(timeTaken) seconds.\n"
            verifyButton.isEnabled = true
        } catch let error as MoproError {
            print("MoproError: \(error)")
            textView.text += "MoproError: \(error)\n"
        } catch {
            print("Unexpected error: \(error)")
            textView.text += "Unexpected error: \(error)\n"
        }
    }

    @objc func runVerifyAction() {
        // Logic for verify
        guard let proof = generatedProof,
            let publicInputs = publicInputs else {
            print("Proof has not been generated yet.")
            return
        }
        do {
            // Verify Proof
            let isValid = try verifyProof2(proof: proof, publicInput: publicInputs)
            assert(isValid, "Proof verification should succeed")

            textView.text += "Proof verification succeeded.\n"
        } catch let error as MoproError {
            print("MoproError: \(error)")
        } catch {
            print("Unexpected error: \(error)")
        }
    }
}
