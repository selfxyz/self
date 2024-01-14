//
//  ViewController.swift
//  MoproKit
//
//  Created by 1552237 on 09/16/2023.
//  Copyright (c) 2023 1552237. All rights reserved.
//

import UIKit
import MoproKit

class KeccakZkeyViewController: UIViewController {

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
        title.text = "Keccak256 (Zkey)"
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
        // Logic for init
        do {
            textView.text += "Initializing library\n"
            // Record start time
            let start = CFAbsoluteTimeGetCurrent()

            try initializeMopro()

            // Record end time and compute duration
            let end = CFAbsoluteTimeGetCurrent()
            let timeTaken = end - start

            textView.text += "Initializing arkzkey took \(timeTaken) seconds.\n"
        } catch let error as MoproError {
            print("MoproError: \(error)")
        } catch {
            print("Unexpected error: \(error)")
        }
    }

    @objc func runProveAction() {
        // Logic for prove (generate_proof2)
        do {
            // Prepare inputs
            let inputVec: [UInt8] = [
                116, 101, 115, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0,
            ]
            let bits = bytesToBits(bytes: inputVec)
            var inputs = [String: [String]]()
            inputs["in"] = bits

            // Expected outputs
            let outputVec: [UInt8] = [
                37, 17, 98, 135, 161, 178, 88, 97, 125, 150, 143, 65, 228, 211, 170, 133, 153, 9, 88,
                212, 4, 212, 175, 238, 249, 210, 214, 116, 170, 85, 45, 21,
            ]
            let outputBits: [String] = bytesToBits(bytes: outputVec)
            // let expectedOutput: [UInt8] = serializeOutputs(outputBits)

            // Record start time
            let start = CFAbsoluteTimeGetCurrent()

            // Generate Proof
            let generateProofResult = try generateProof2(circuitInputs: inputs)
            assert(!generateProofResult.proof.isEmpty, "Proof should not be empty")
            //assert(Data(expectedOutput) == generateProofResult.inputs, "Circuit outputs mismatch the expected outputs")

            // Record end time and compute duration
            let end = CFAbsoluteTimeGetCurrent()
            let timeTaken = end - start

            // Store the generated proof and public inputs for later verification
            generatedProof = generateProofResult.proof
            publicInputs = generateProofResult.inputs

            textView.text += "Proof generation took \(timeTaken) seconds.\n"
            // TODO: Enable verify
            verifyButton.isEnabled = false
            //verifyButton.isEnabled = true // Enable the Verify button once proof has been generated
        } catch let error as MoproError {
            print("MoproError: \(error)")
        } catch {
            print("Unexpected error: \(error)")
        }
    }

    @objc func runVerifyAction() {
        // Logic for verify
    }
}
