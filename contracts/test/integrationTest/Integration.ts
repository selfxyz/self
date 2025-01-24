const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

import {ethers} from "hardhat";
import {BigNumberish, ContractTransactionReceipt, Log} from "ethers";
import {expect} from "chai";
import {Contract, Signer} from "ethers";
import {groth16} from "snarkjs";
import fs from 'fs';
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import { SMT, ChildNodes } from "@openpassport/zk-kit-smt";
import { poseidon2, poseidon3 } from "poseidon-lite";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import path from "path";

// Common imports
import { buildSMT } from "../../../common/src/utils/smtTree";
import { PassportData } from "../../../common/src/utils/types";
import { genMockPassportData } from "../../../common/src/utils/genMockPassportData";
import { 
    generateCircuitInputsRegister,
    generateCircuitInputsDisclose
} from "../../../common/src/utils/generateInputs";
import { generateCommitment } from "../../../common/src/utils/pubkeyTree";
import {
    generateCircuitInputsDSC
} from "../../../common/src/utils/csca";
import {
    generateDscSecret,
    getCSCAModulusMerkleTree
} from "../../../common/src/utils/csca";
import { 
    RegisterVerifierId,
    DscVerifierId
} from "../../../common/src/constants/constants";
import type { 
    IIdentityVerificationHubV1,
    IRegisterCircuitVerifier,
    IDscCircuitVerifier,
    IVcAndDiscloseCircuitVerifier
} from "../../typechain-types/contracts/IdentityVerificationHubImplV1";
type PassportProof = IIdentityVerificationHubV1.PassportProofStruct;
type RegisterCircuitProof = IRegisterCircuitVerifier.RegisterCircuitProofStruct;
type DscCircuitProof = IDscCircuitVerifier.DscCircuitProofStruct;
type VcAndDiscloseHubProof = IIdentityVerificationHubV1.VcAndDiscloseHubProofStruct;
type VcAndDiscloseProof = IVcAndDiscloseCircuitVerifier.VcAndDiscloseProofStruct;

import type { CircuitSignals } from "snarkjs";
import type { 
    PublicSignals,
    Groth16Proof
} from "snarkjs";

// Contract imports
import {
    ATTESTATION_ID,
    CONTRACT_CONSTANTS
} from "../utils/constants"
import {
    IdentityVerificationHub,
    IdentityVerificationHubImplV1,
    IdentityRegistry,
    IdentityRegistryImplV1,
    Verifier_vc_and_disclose,
    Verifier_register_rsa_65537_sha256,
    Verifier_dsc_rsa_sha256_65537_4096,
} from "../../typechain-types";

import type { Verifier_vc_and_disclose as ProdVerifier } from "../../typechain-types/contracts/verifiers/disclose/Verifier_vc_and_disclose";
import type { Verifier_vc_and_disclose as LocalVerifier } from "../../typechain-types/contracts/verifiers/local/disclose/Verifier_vc_and_disclose";
import type { Verifier_register_rsa_65537_sha256 as ProdRegisterVerifier } from "../../typechain-types/contracts/verifiers/register/Verifier_register_rsa_65537_sha256";
import type { Verifier_register_sha256_sha256_sha256_rsa_65537_4096 as LocalRegisterVerifier } from "../../typechain-types/contracts/verifiers/local/register/Verifier_register_sha256_sha256_sha256_rsa_65537_4096";
import type { Verifier_dsc_rsa_65537_sha256_4096 as ProdDscVerifier } from "../../typechain-types/contracts/verifiers/dsc/Verifier_dsc_rsa_65537_sha256_4096";
import type { Verifier_dsc_rsa_sha256_65537_4096 as LocalDscVerifier } from "../../typechain-types/contracts/verifiers/local/dsc/Verifier_dsc_rsa_sha256_65537_4096";

import VcAndDiscloseVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/disclose/Verifier_vc_and_disclose.sol/Verifier_vc_and_disclose.json";
import VcAndDiscloseVerifierArtifactProd from "../../artifacts/contracts/verifiers/disclose/Verifier_vc_and_disclose.sol/Verifier_vc_and_disclose.json";
import RegisterVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/register/Verifier_register_sha256_sha256_sha256_rsa_65537_4096.sol/Verifier_register_sha256_sha256_sha256_rsa_65537_4096.json";
import RegisterVerifierArtifactProd from "../../artifacts/contracts/verifiers/register/Verifier_register_rsa_65537_sha256.sol/Verifier_register_rsa_65537_sha256.json";
import DscVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/dsc/Verifier_dsc_rsa_sha256_65537_4096.sol/Verifier_dsc_rsa_sha256_65537_4096.json";
import DscVerifierArtifactProd from "../../artifacts/contracts/verifiers/dsc/Verifier_dsc_rsa_65537_sha256_4096.sol/Verifier_dsc_rsa_65537_sha256_4096.json";

type VcAndDiscloseVerifier = typeof process.env.TEST_ENV extends "local" ? LocalVerifier : ProdVerifier;
type RegisterVerifier = typeof process.env.TEST_ENV extends "local" ? LocalRegisterVerifier : ProdRegisterVerifier;
type DscVerifier = typeof process.env.TEST_ENV extends "local" ? LocalDscVerifier : ProdDscVerifier;

interface DeployedActors {
    hub: IdentityVerificationHubImplV1;
    registry: IdentityRegistryImplV1;
    vcAndDisclose: VcAndDiscloseVerifier;
    register: RegisterVerifier;
    dsc: DscVerifier;
    owner: Signer;
    user1: Signer;
    mockPassport: PassportData;
}

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
const registerCircuits: CircuitArtifacts = {
    "register_sha256_sha256_sha256_rsa_65537_4096": {
        wasm: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_js/register_sha256_sha256_sha256_rsa_65537_4096.wasm",
        zkey: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_final.zkey",
        vkey: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_vkey.json"
    }
};
const dscCircuits: CircuitArtifacts = {
    "dsc_sha256_sha256_sha256_rsa_65537_4096": {
        wasm: "../circuits/build/dsc/dsc_rsa_sha256_65537_4096/dsc_rsa_sha256_65537_4096_js/dsc_rsa_sha256_65537_4096.wasm",
        zkey: "../circuits/build/dsc/dsc_rsa_sha256_65537_4096/dsc_rsa_sha256_65537_4096_final.zkey",
        vkey: "../circuits/build/dsc/dsc_rsa_sha256_65537_4096/dsc_rsa_sha256_65537_4096_vkey.json"
    }
};
const vcAndDiscloseCircuits: CircuitArtifacts = {
    "vc_and_disclose": {
        wasm: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_js/vc_and_disclose.wasm",
        zkey: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_final.zkey",
        vkey: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_vkey.json"
    }
}

describe("Test passport commitment register", async function () {
    this.timeout(0);

    let deployedActors: DeployedActors;
    let snapshotId: string;

    before(async () => {
        deployedActors = await deploySystemFixtures();
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    // describe("Contract Initialization", async () => {
    //     it("should deploy and initialize correctly", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;
    
    //         const hubAddress = await registry.getHubAddress();
    //         expect(hubAddress).to.equal(hub.target);
    
    //         const registryAddress = await hub.getRegistryAddress();
    //         expect(registryAddress).to.equal(registry.target);
    
    //         expect(await hub.owner()).to.equal(await owner.getAddress());
    //         expect(await registry.owner()).to.equal(await owner.getAddress());
    //     });
    // });

    // describe("Identity Commitment Registration", async () => {
    //     it ("should register a new identity commitment", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

    //         const registerSecret = "1234567890";
    //         const dscSecret = generateDscSecret();

    //         const registerProof = await generateRegisterProof(
    //             registerSecret,
    //             dscSecret,
    //             mockPassport
    //         );

    //         const dscProof = await generateDscProof(
    //             dscSecret,
    //             mockPassport.dsc,
    //             1664,
    //         );

    //         const passportProof: PassportProof = {
    //             registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    //             dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
    //             registerCircuitProof: registerProof,
    //             dscCircuitProof: dscProof
    //         };

    //         const previousRoot = await registry.getIdentityCommitmentMerkleRoot();
    //         console.log(YELLOW, "Previous root: ", previousRoot, RESET);
    //         const tx = await hub.verifyAndRegisterPassportCommitment(passportProof);
    //         const receipt = await tx.wait() as ContractTransactionReceipt;
    //         const event = (receipt.logs[0] as Log);
    //         const eventArgs = registry.interface.parseLog(event)?.args;

    //         const block = await ethers.provider.getBlock(receipt.blockNumber);
    //         const blockTimestamp = block!.timestamp;

    //         const currentRoot = await registry.getIdentityCommitmentMerkleRoot();
    //         const size = await registry.getIdentityCommitmentMerkleTreeSize();
    //         const rootTimestamp = await registry.getIdentityCommitmentRootTimestamp(currentRoot);
            
    //         // Check event args
    //         expect(eventArgs?.attestationId).to.equal(ATTESTATION_ID.E_PASSPORT);
    //         expect(eventArgs?.nullifier).to.equal(registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_NULLIFIER_INDEX]);
    //         expect(eventArgs?.commitment).to.equal(registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_COMMITMENT_INDEX]);
    //         expect(eventArgs?.timestamp).to.equal(blockTimestamp);
    //         expect(eventArgs?.imtRoot).to.equal(currentRoot);
    //         expect(eventArgs?.imtIndex).to.equal(0);

    //         // Check state
    //         expect(currentRoot).to.not.equal(previousRoot);
    //         expect(size).to.equal(1);
    //         expect(rootTimestamp).to.equal(blockTimestamp);
    //     });

    //     it("should fail when register proof verification fails", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

    //         const registerSecret = "1234567890";
    //         const dscSecret = generateDscSecret();

    //         const registerProof = await generateRegisterProof(
    //             registerSecret,
    //             dscSecret,
    //             mockPassport
    //         );

    //         // Modify the proof to make it invalid
    //         registerProof.a[0] = "123456789";

    //         const dscProof = await generateDscProof(
    //             dscSecret,
    //             mockPassport.dsc,
    //             1664,
    //         );

    //         const passportProof: PassportProof = {
    //             registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    //             dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
    //             registerCircuitProof: registerProof,
    //             dscCircuitProof: dscProof
    //         };

    //         await expect(
    //             hub.verifyAndRegisterPassportCommitment(passportProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_REGISTER_PROOF");
    //     });
    
    //     it("should fail when DSC proof verification fails", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

    //         const registerSecret = "1234567890";
    //         const dscSecret = generateDscSecret();

    //         const registerProof = await generateRegisterProof(
    //             registerSecret,
    //             dscSecret,
    //             mockPassport
    //         );

    //         const dscProof = await generateDscProof(
    //             dscSecret,
    //             mockPassport.dsc,
    //             1664,
    //         );

    //         // Modify the DSC proof to make it invalid
    //         dscProof.a[0] = "123456789";

    //         const passportProof: PassportProof = {
    //             registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    //             dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
    //             registerCircuitProof: registerProof,
    //             dscCircuitProof: dscProof
    //         };

    //         await expect(
    //             hub.verifyAndRegisterPassportCommitment(passportProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_DSC_PROOF");
    //     });
    
    //     it("should fail when blinded DSC commitments don't match", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

    //         const registerSecret = "1234567890";
    //         const dscSecret = generateDscSecret();
    //         const differentDscSecret = generateDscSecret();

    //         const registerProof = await generateRegisterProof(
    //             registerSecret,
    //             dscSecret,
    //             mockPassport
    //         );

    //         const dscProof = await generateDscProof(
    //             differentDscSecret,
    //             mockPassport.dsc,
    //             1664,
    //         );

    //         const passportProof: PassportProof = {
    //             registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    //             dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
    //             registerCircuitProof: registerProof,
    //             dscCircuitProof: dscProof
    //         };

    //         await expect(
    //             hub.verifyAndRegisterPassportCommitment(passportProof)
    //         ).to.be.revertedWithCustomError(hub, "UNEQUAL_BLINDED_DSC_COMMITMENT");
    //     });
    
    //     it("should fail when CSCA root is invalid", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

    //         await registry.updateCscaRoot(123456789);

    //         const registerSecret = "1234567890";
    //         const dscSecret = generateDscSecret();

    //         const registerProof = await generateRegisterProof(
    //             registerSecret,
    //             dscSecret,
    //             mockPassport
    //         );

    //         const dscProof = await generateDscProof(
    //             dscSecret,
    //             mockPassport.dsc,
    //             1664,
    //         );

    //         const passportProof: PassportProof = {
    //             registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    //             dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
    //             registerCircuitProof: registerProof,
    //             dscCircuitProof: dscProof
    //         };

    //         await expect(
    //             hub.verifyAndRegisterPassportCommitment(passportProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_CSCA_ROOT");

    //         const cscaModulusMerkleTree = getCSCAModulusMerkleTree();
    //         await registry.updateCscaRoot(cscaModulusMerkleTree.root);
    //     });
    
    //     it("should fail when nullifier is already used", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

    //         const registerSecret = "1234567890";
    //         const dscSecret = generateDscSecret();

    //         const registerProof = await generateRegisterProof(
    //             registerSecret,
    //             dscSecret,
    //             mockPassport
    //         );

    //         const dscProof = await generateDscProof(
    //             dscSecret,
    //             mockPassport.dsc,
    //             1664,
    //         );

    //         const passportProof: PassportProof = {
    //             registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    //             dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
    //             registerCircuitProof: registerProof,
    //             dscCircuitProof: dscProof
    //         };

    //         await hub.verifyAndRegisterPassportCommitment(passportProof);

    //         await expect(
    //             hub.verifyAndRegisterPassportCommitment(passportProof)
    //         ).to.be.revertedWithCustomError(registry, "REGISTERED_IDENTITY");
    //     });
    
    //     it("should fail when called by non-hub address", async () => {
    //         const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

    //         await expect(
    //             registry.connect(user1).registerCommitment(
    //                 ATTESTATION_ID.E_PASSPORT,
    //                 123456789, // dummy nullifier
    //                 987654321  // dummy commitment
    //             )
    //         ).to.be.revertedWithCustomError(registry, "ONLY_HUB_CAN_REGISTER_COMMITMENT");
    //     });
    // });

    describe("VC and Disclose", () => {
        it("should verify VC and Disclose proof", async () => {
            const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = deployedActors;

            const registerSecret = "1234567890";
            const dscSecret = generateDscSecret();

            const registerProof = await generateRegisterProof(
                registerSecret,
                dscSecret,
                mockPassport
            );
            console.log("nullifier: ", BigInt(registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_NULLIFIER_INDEX]));
            console.log("commitment: ", BigInt(registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_COMMITMENT_INDEX]));

            const dscProof = await generateDscProof(
                dscSecret,
                mockPassport.dsc,
                1664,
            );

            const passportProof: PassportProof = {
                registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
                dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
                registerCircuitProof: registerProof,
                dscCircuitProof: dscProof
            };

            await hub.verifyAndRegisterPassportCommitment(passportProof);

            const commitment = registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_COMMITMENT_INDEX];
            console.log("Commitment: ", BigInt(commitment));
            const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
            const imt = new LeanIMT<bigint>(hashFunction);
            imt.insert(BigInt(commitment));

            const root = await registry.getIdentityCommitmentMerkleRoot();
            expect(imt.root).to.equal(root);

            const vcAndDiscloseProof = await generateVcAndDiscloseProof(
                registerSecret,
                ATTESTATION_ID.E_PASSPORT,
                mockPassport,
                "scope",  
                new Array(93).fill("1"),
                "18",
                imt,          
                "20",
                undefined,
                "0",
                ["AAA"],
                "70997970C51812dc3A010C7d01b50e0d17dc79C8"
            );

            const result = await hub.verifyVcAndDiscloseAndGetMinimumResult(
                vcAndDiscloseProof,
            );

            expect(result.verified).to.be.true;
            expect(result.olderThan).to.be.true;
            expect(result.forbiddenCountries).to.be.true;
            expect(result.ofac).to.be.true;
        });
    });
});

async function generateRegisterProof(
    secret: number | string,
    dscSecret: number | string,
    passportData: PassportData
): Promise<RegisterCircuitProof> {
    console.log(CYAN, "=== Start generateRegisterProof ===", RESET);
    
    // Get the circuit inputs
    const registerCircuitInputs: CircuitSignals = generateCircuitInputsRegister(
        secret,
        dscSecret,
        passportData
    );

    // Generate the proof
    const startTime = performance.now();
    
    const registerProof: {
        proof: Groth16Proof,
        publicSignals: PublicSignals
    } = await groth16.fullProve(
        registerCircuitInputs,
        registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].wasm,
        registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].zkey
    );
    
    const endTime = performance.now();
    console.log(GREEN, `groth16.fullProve execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`, RESET);

    // Verify the proof
    const vKey = JSON.parse(fs.readFileSync(registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].vkey, 'utf8'));
    const isValid = await groth16.verify(vKey, registerProof.publicSignals, registerProof.proof);
    if (!isValid) {
        throw new Error("Generated register proof verification failed");
    }
    console.log(GREEN, "Register proof verified successfully", RESET);

    const rawCallData = await groth16.exportSolidityCallData(registerProof.proof, registerProof.publicSignals);
    const fixedProof = parseSolidityCalldata(rawCallData, {} as RegisterCircuitProof);

    console.log(CYAN, "=== End generateRegisterProof ===", RESET);
    return fixedProof;
}

async function generateDscProof(
    dscSecret: string,
    dscCertificate: any,
    maxCertBytes: number,
): Promise<DscCircuitProof> {
    console.log(CYAN, "=== Start generateDscProof ===", RESET);

    const dscCircuitInputs: CircuitSignals = generateCircuitInputsDSC(
        dscSecret,
        dscCertificate,
        maxCertBytes,
        true
    ).inputs;

    const startTime = performance.now();
    const dscProof = await groth16.fullProve(
        dscCircuitInputs,
        dscCircuits["dsc_sha256_sha256_sha256_rsa_65537_4096"].wasm,
        dscCircuits["dsc_sha256_sha256_sha256_rsa_65537_4096"].zkey
    );
    const endTime = performance.now();
    console.log(GREEN, `groth16.fullProve execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`, RESET);

    // Verify the proof
    const vKey = JSON.parse(fs.readFileSync(dscCircuits["dsc_sha256_sha256_sha256_rsa_65537_4096"].vkey, 'utf8'));
    const isValid = await groth16.verify(vKey, dscProof.publicSignals, dscProof.proof);
    if (!isValid) {
        throw new Error("Generated DSC proof verification failed");
    }
    console.log(GREEN, "DSC proof verified successfully", RESET);

    const rawCallData = await groth16.exportSolidityCallData(dscProof.proof, dscProof.publicSignals);
    const fixedProof = parseSolidityCalldata(rawCallData, {} as DscCircuitProof);

    console.log(CYAN, "=== End generateDscProof ===", RESET);
    return fixedProof;
}

async function generateVcAndDiscloseProof(
    secret: string,
    attestationId: string,
    passportData: PassportData,
    scope: string,
    selectorDg1: string[] = new Array(93).fill("1"),
    selectorOlderThan: string | number = "1",
    merkletree: LeanIMT<bigint>,
    majority: string = "20",
    smt?: SMT,
    selectorOfac: string | number = "0",
    forbiddenCountriesList: string[] = ["AAA"],
    userIdentifier: string = "70997970C51812dc3A010C7d01b50e0d17dc79C8"
): Promise<VcAndDiscloseHubProof> {

    smt = getSMT();
    
    const vcAndDiscloseCircuitInputs: CircuitSignals = generateCircuitInputsDisclose(
        secret,
        attestationId,
        passportData,
        scope,
        selectorDg1,
        selectorOlderThan,
        merkletree,
        majority,
        smt,
        selectorOfac,
        forbiddenCountriesList,
        userIdentifier
    );

    const startTime = performance.now();
    const vcAndDiscloseProof = await groth16.fullProve(
        vcAndDiscloseCircuitInputs,
        vcAndDiscloseCircuits["vc_and_disclose"].wasm,
        vcAndDiscloseCircuits["vc_and_disclose"].zkey
    );
    const endTime = performance.now();
    console.log(GREEN, `groth16.fullProve execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`, RESET);

    // Verify the proof
    const vKey = JSON.parse(fs.readFileSync(vcAndDiscloseCircuits["vc_and_disclose"].vkey, 'utf8'));
    const isValid = await groth16.verify(vKey, vcAndDiscloseProof.publicSignals, vcAndDiscloseProof.proof);
    if (!isValid) {
        throw new Error("Generated VC and Disclose proof verification failed");
    }
    console.log(GREEN, "VC and Disclose proof verified successfully", RESET);

    const rawCallData = await groth16.exportSolidityCallData(vcAndDiscloseProof.proof, vcAndDiscloseProof.publicSignals);
    const fixedProof = parseSolidityCalldata(rawCallData, {} as VcAndDiscloseProof);

    const vcAndDiscloseHubProof: VcAndDiscloseHubProof = {
        olderThanEnabled: true,
        olderThan: selectorOlderThan,
        forbiddenCountriesEnabled: true,
        forbiddenCountriesList: forbiddenCountriesList,
        ofacEnabled: true,
        vcAndDiscloseProof: fixedProof
    };

    console.log(CYAN, "=== End generateVcAndDiscloseProof ===", RESET);
    return vcAndDiscloseHubProof;
}

async function deploySystemFixtures() {
    let identityVerificationHubProxy: IdentityVerificationHub;
    let identityVerificationHubImpl: IdentityVerificationHubImplV1;

    let identityRegistryProxy: IdentityRegistry;
    let identityRegistryImpl: IdentityRegistryImplV1;

    let vcAndDiscloseVerifier: VcAndDiscloseVerifier;
    let registerVerifier: RegisterVerifier;
    let dscVerifier: DscVerifier;

    let owner: Signer;
    let user1: Signer;

    let mockPassport: PassportData;

    [owner, user1] = await ethers.getSigners();

    mockPassport = genMockPassportData(
        "sha256",
        "sha256",
        "rsa_sha256_65537_2048",
        "FRA",
        "940131",
        "401031"
    );

    // Deploy verifiers
    // Deploy vc and disclose verifier
    const vcAndDiscloseVerifierArtifact = process.env.TEST_ENV === "local" 
      ? VcAndDiscloseVerifierArtifactLocal 
      : VcAndDiscloseVerifierArtifactProd;
    const vcAndDiscloseVerifierFactory = await ethers.getContractFactory(
        vcAndDiscloseVerifierArtifact.abi,
        vcAndDiscloseVerifierArtifact.bytecode,
        owner
    );
    vcAndDiscloseVerifier = await vcAndDiscloseVerifierFactory.deploy();
    await vcAndDiscloseVerifier.waitForDeployment();

    // Deploy register verifier
    const registerVerifierArtifact = process.env.TEST_ENV === "local" 
      ? RegisterVerifierArtifactLocal 
      : RegisterVerifierArtifactProd;
    const registerVerifierFactory = await ethers.getContractFactory(
        registerVerifierArtifact.abi,
        registerVerifierArtifact.bytecode,
        owner
    );
    registerVerifier = await registerVerifierFactory.deploy();
    await registerVerifier.waitForDeployment();

    // Deploy dsc verifier
    const dscVerifierArtifact = process.env.TEST_ENV === "local" 
      ? DscVerifierArtifactLocal 
      : DscVerifierArtifactProd;
    const dscVerifierFactory = await ethers.getContractFactory(
        dscVerifierArtifact.abi,
        dscVerifierArtifact.bytecode,
        owner
    );
    dscVerifier = await dscVerifierFactory.deploy();
    await dscVerifier.waitForDeployment();

    // Deploy implementation contracts

    // Deploy PoseidonT3
    const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3", owner);
    const poseidonT3 = await PoseidonT3Factory.deploy();
    await poseidonT3.waitForDeployment();
    
    // Deploy IdentityRegistryImplV1
    const IdentityRegistryImplFactory = await ethers.getContractFactory("IdentityRegistryImplV1", 
        {
            libraries: {
                PoseidonT3: poseidonT3.target
            }
        },
        owner);
    identityRegistryImpl = await IdentityRegistryImplFactory.deploy();
    await identityRegistryImpl.waitForDeployment();

    // Deploy IdentityVerificationHubImplV1
    const IdentityVerificationHubImplFactory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
    identityVerificationHubImpl = await IdentityVerificationHubImplFactory.deploy();
    await identityVerificationHubImpl.waitForDeployment();

    // Deplo registry with mocked hub address
    const temporaryHubAddress = "0x0000000000000000000000000000000000000000";
    const registryInitData = identityRegistryImpl.interface.encodeFunctionData("initialize", [
      temporaryHubAddress
    ]);
    const registryProxyFactory = await ethers.getContractFactory("IdentityRegistry", owner);
    identityRegistryProxy = await registryProxyFactory.deploy(identityRegistryImpl.target, registryInitData);
    await identityRegistryProxy.waitForDeployment();

    // Deploy hub with deployed registry and verifiers
    const initializeData = identityVerificationHubImpl.interface.encodeFunctionData("initialize", [
        identityRegistryProxy.target,
        vcAndDiscloseVerifier.target,
        [RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096],
        [registerVerifier.target],
        [DscVerifierId.dsc_rsa_sha256_65537_4096],
        [dscVerifier.target]
    ]);
    const hubFactory = await ethers.getContractFactory("IdentityVerificationHub", owner);
    identityVerificationHubProxy = await hubFactory.deploy(identityVerificationHubImpl.target, initializeData);
    await identityVerificationHubProxy.waitForDeployment();

    // Get registry and hub contracts with impl abi
    // Update hub address in registry
    const registryContract = await ethers.getContractAt(
        "IdentityRegistryImplV1", 
        identityRegistryProxy.target
    ) as IdentityRegistryImplV1;
    await registryContract.updateHub(identityVerificationHubProxy.target);

    const hubContract = await ethers.getContractAt(
        "IdentityVerificationHubImplV1",
        identityVerificationHubProxy.target
    ) as IdentityVerificationHubImplV1;

    const cscaModulusMerkleTree = getCSCAModulusMerkleTree();
    await registryContract.updateCscaRoot(cscaModulusMerkleTree.root, {from: owner});

    const nameSMT = new SMT(poseidon2, true);
    nameSMT.import(nameSMT.export());
    await registryContract.updateOfacRoot(nameSMT.root, {from: owner});

    return {
        hub: hubContract,
        registry: registryContract,
        vcAndDisclose: vcAndDiscloseVerifier,
        register: registerVerifier,
        dsc: dscVerifier,
        owner: owner,
        user1: user1,
        mockPassport: mockPassport
    }
}

function parseSolidityCalldata<T>(rawCallData: string, _type: T): T {
    const parsed = JSON.parse("[" + rawCallData + "]");
    
    return {
        a: parsed[0].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
        b: parsed[1].map((arr: string[]) => 
            arr.map((x: string) => x.replace(/"/g, ''))
        ) as [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]],
        c: parsed[2].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
        pubSignals: parsed[3].map((x: string) => x.replace(/"/g, '')) as BigNumberish[]
    } as T;
}

function getSMT() {
    let name = fs.readFileSync("../common/ofacdata/inputs/names.json", "utf-8");
    let name_list = JSON.parse(name);
    let mockSmt;
    if (fs.existsSync("./test/integrationTest/smt.json")) {
        mockSmt = importSMTFromJsonFile("./test/integrationTest/smt.json") as SMT;
    } else {
        const builtSmt = buildSMT(name_list, "name");
        exportSMTToJsonFile(builtSmt[0], builtSmt[1], builtSmt[2], "./test/integrationTest/smt.json");
        mockSmt = builtSmt[2] as SMT;
    }
    return mockSmt;
}

function exportSMTToJsonFile(count: number, time: number, smt: SMT, outputPath?: string) {
    const serializedSMT = smt.export();
    const data = {
        count: count,
        time: time,
        smt: serializedSMT
    };
    const jsonString = JSON.stringify(data, null, 2);
    const defaultPath = path.join(process.cwd(), 'smt.json');
    const finalPath = outputPath ? path.resolve(process.cwd(), outputPath) : defaultPath;
  
    fs.writeFileSync(finalPath, jsonString, 'utf8');
}

function importSMTFromJsonFile(filePath?: string): SMT | null {
    try {
        const jsonString = fs.readFileSync(path.resolve(process.cwd(), filePath as string), 'utf8');
          
        const data = JSON.parse(jsonString);
          
        const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes));
        const smt = new SMT(hash2, true);
        smt.import(data.smt);
          
        console.log('Successfully imported SMT from JSON file');
        return smt;
    } catch (error) {
        console.error('Failed to import SMT from JSON file:', error);
        return null;
    }
}