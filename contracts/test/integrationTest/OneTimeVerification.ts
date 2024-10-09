import { ethers } from "hardhat";
import { expect } from "chai";
import { groth16 } from "snarkjs";
import {
    VERIFICATION_TYPE_ENUM_PROVE,
    VERIFICATION_TYPE_ENUM_DSC
} from "../../../common/src/constants/contractConstants";
import { PassportData } from "../../../common/src/utils/types";
import { genMockPassportData } from "../../../common/src/utils/genMockPassportData";

type CircuitArtifacts = {
    [key: string]: {
        wasm: string,
        zkey: string,
        vkey: string,
        verifier?: any,
        inputs?: any,
        parsedCallData?: any,
        formattedCallData?: any,
    }
}

describe("Test one time verification flow", async function () {
    this.timeout(0);

    // contracts
    let verifiersManager: any;
    let formatter: any;
    let oneTimeSBT: any;

    let verifierProveRsa65537Sha256: any;
    let verifierDscRsa65537Sha256_4096: any;

    // EVM state id
    let snapshotId: any;

    // users
    let owner: any;
    let addr1: any;
    let addr2: any;

    // mock passport
    let mockPassport: PassportData = genMockPassportData(
        "rsa_sha256",
        "FRA",
        "940131",
        "401031"
    );

    let prove_circuits: CircuitArtifacts = {};
    if (process.env.TEST_ENV === "local") {
        prove_circuits["prove_rsa_65537_sha256"] = {
            wasm: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_js/prove_rsa_65537_sha256.wasm",
            zkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_final.zkey",
            vkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_vkey.json"
        }
    } else if (process.env.TEST_ENV === "prod") {
        prove_circuits["prove_rsa_65537_sha256"] = {
            wasm: "../circuits/build/fromAWS/prove_rsa_65537_sha256.wasm",
            zkey: "../circuits/build/fromAWS/prove_rsa_65537_sha256.zkey",
            vkey: "../circuits/build/fromAWS/prove_rsa_65537_sha256_vkey.json"
        }
    } else {
        prove_circuits["prove_rsa_65537_sha256"] = {
            wasm: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_js/prove_rsa_65537_sha256.wasm",
            zkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_final.zkey",
            vkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_vkey.json"
        }
    }

    let dsc_circuits: CircuitArtifacts = {};
    dsc_circuits["dsc_rsa_65537_sha256_4096"] = {
        wasm: "../circuits/build/dsc/dsc_rsa_65537_sha256_4096/dsc_rsa_65537_sha256_4096_js/dsc_rsa_65537_sha256_4096.wasm",
        zkey: "../circuits/build/dsc/dsc_rsa_65537_sha256_4096/dsc_rsa_65537_sha256_4096_final.zkey",
        vkey: "../circuits/build/dsc/dsc_rsa_65537_sha256_4096/dsc_rsa_65537_sha256_4096_vkey.json"
    }
    // if (process.env.TEST_ENV === "local") {
    //     prove_circuits["prove_rsa_65537_sha256"] = {
    //         wasm: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_js/prove_rsa_65537_sha256.wasm",
    //         zkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_final.zkey",
    //         vkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_vkey.json"
    //     }
    // } else if (process.env.TEST_ENV === "prod") {
    //     prove_circuits["prove_rsa_65537_sha256"] = {
    //         wasm: "../circuits/build/fromAWS/prove_rsa_65537_sha256.wasm",
    //         zkey: "../circuits/build/fromAWS/prove_rsa_65537_sha256.zkey",
    //         vkey: "../circuits/build/fromAWS/prove_rsa_65537_sha256_vkey.json"
    //     }
    // } else {
    //     prove_circuits["prove_rsa_65537_sha256"] = {
    //         wasm: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_js/prove_rsa_65537_sha256.wasm",
    //         zkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_final.zkey",
    //         vkey: "../circuits/build/prove/prove_rsa_65537_sha256/prove_rsa_65537_sha256_vkey.json"
    //     }
    // }

    before(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Set up contracts
        let verifierProveRsa65537Sha256Factory: any;
        if (process.env.TEST_ENV === "local") {
            verifierProveRsa65537Sha256Factory = await ethers.getContractFactory("contracts/verifiers/local/prove/Verifier_prove_rsa_65537_sha256.sol:Verifier_prove_rsa_65537_sha256", owner);
        } else if (process.env.TEST_ENV === "prod") {
            verifierProveRsa65537Sha256Factory = await ethers.getContractFactory("contracts/verifiers/prove/Verifier_prove_rsa_65537_sha256.sol:Verifier_prove_rsa_65537_sha256", owner);
        } else {
            verifierProveRsa65537Sha256Factory = await ethers.getContractFactory("contracts/verifiers/local/prove/Verifier_prove_rsa_65537_sha256.sol:Verifier_prove_rsa_65537_sha256", owner);
        }
        verifierProveRsa65537Sha256 = await verifierProveRsa65537Sha256Factory.deploy();
        await verifierProveRsa65537Sha256.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_prove_rsa_65537_sha256 deployed to ${verifierProveRsa65537Sha256.target}`);

        let verifierDscRsa65537Sha256_4096Factory: any;
        if (process.env.TEST_ENV === "local") {
            verifierDscRsa65537Sha256_4096Factory = await ethers.getContractFactory("contracts/verifiers/local/dsc/Verifier_dsc_rsa_65537_sha256_4096.sol:Verifier_dsc_rsa_65537_sha256_4096", owner);
        } else if (process.env.TEST_ENV === "prod") {
            verifierDscRsa65537Sha256_4096Factory = await ethers.getContractFactory("contracts/verifiers/dsc/Verifier_dsc_rsa_65537_sha256_4096.sol:Verifier_dsc_rsa_65537_sha256_4096", owner);
        } else {
            verifierDscRsa65537Sha256_4096Factory = await ethers.getContractFactory("contracts/verifiers/local/dsc/Verifier_dsc_rsa_65537_sha256_4096.sol:Verifier_dsc_rsa_65537_sha256_4096", owner);
        }
        verifierDscRsa65537Sha256_4096 = await verifierDscRsa65537Sha256_4096Factory.deploy();
        await verifierDscRsa65537Sha256_4096.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_dsc_rsa_65537_sha256_4096 deployed to ${verifierDscRsa65537Sha256_4096.target}`);

        const verifiersManagerFactory = await ethers.getContractFactory("VerifiersManager", owner);
        verifiersManager = await verifiersManagerFactory.deploy();
        await verifiersManager.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `VerfiersManager deployed to ${verifiersManager.target}`);

        const formatterFactory = await ethers.getContractFactory("Formatter", owner);
        formatter = await formatterFactory.deploy();
        await formatter.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `formatter deployed to ${formatter.target}`);

        const sbtFactory = await ethers.getContractFactory("OneTimeSBT", owner);
        oneTimeSBT = await sbtFactory.deploy(
            verifiersManager,
            formatter
        );
        await oneTimeSBT.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `sbt deployed to ${oneTimeSBT.target}`);

        const PROVE_RSA_65537_SHA256_VERIFIER_ID = 0;
        const DSC_RSA65537_SHA256_4096_VERIFIER_ID = 0;
        await verifiersManager.updateVerifier(
            VERIFICATION_TYPE_ENUM_PROVE,
            PROVE_RSA_65537_SHA256_VERIFIER_ID,
            verifierProveRsa65537Sha256.target
        );
        await verifiersManager.updateVerifier(
            VERIFICATION_TYPE_ENUM_DSC,
            DSC_RSA65537_SHA256_4096_VERIFIER_ID,
            verifierDscRsa65537Sha256_4096.target
        );

        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    describe("test", async function() {
        it("Should be able to deploy", async function() {
            
        });
    });

});