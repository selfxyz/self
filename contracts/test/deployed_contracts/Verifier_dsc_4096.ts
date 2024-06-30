import { ethers } from "ethers";
import verifier_dsc_4096_artifacts from "../../../app/deployments/artifacts/Deploy_Registry#Verifier_dsc_4096.json";
import contractAddresses from "../../../app/deployments/deployed_addresses.json";
import { RPC_URL } from "../../../common/src/constants/constants";

async function verifyProof() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const verifier_contract = new ethers.Contract(
        contractAddresses["Deploy_Registry#Verifier_dsc_4096"],
        verifier_dsc_4096_artifacts.abi,
        provider
    );

    const mock_parsed_callData_dsc = [
        [
            '0x0',
            '0x0'
        ],
        [
            [
                '0x0',
                '0x0'
            ],
            [
                '0x0',
                '0x0'
            ]
        ],
        [
            '0x0',
            '0x0'
        ],
        [
            '0x0',
            '0x0'
        ]
    ]

    try {
        const result = await verifier_contract.verifyProof(
            mock_parsed_callData_dsc[0],
            mock_parsed_callData_dsc[1],
            mock_parsed_callData_dsc[2],
            mock_parsed_callData_dsc[3]
        );
        console.log("Verification result:", result);
    } catch (error) {
        console.error("Error verifying proof:", error);
    }
}

verifyProof();


