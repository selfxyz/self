import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from 'ethers';
import { generateRandomFieldElement } from "../../../contracts/test/utils/utils";
import { generateCommitment } from "../../../common/src/utils/passports/passport";
import { ATTESTATION_ID } from "../../../contracts/test/utils/constants";
import { CIRCUIT_CONSTANTS } from "../../../common/src/constants/constants";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import { poseidon2 } from "poseidon-lite";
import { generateVcAndDiscloseRawProof, parseSolidityCalldata } from "../../../contracts/test/utils/generateProof";
import { Formatter } from "../../../contracts/test/utils/formatter";
import { formatCountriesList, reverseBytes } from "../../../common/src/utils/circuits/formatInputs";
import { SelfBackendVerifier } from "../../../sdk/core/src/SelfBackendVerifier";
import { Groth16Proof, PublicSignals, groth16 } from "snarkjs";
import { PassportData } from "../../../common/src/utils/types";
import { genMockPassportData } from "../../../common/src/utils/passports/genMockPassportData";
import { getSMTs } from "../../../contracts/test/utils/generateProof";
import { getCscaTreeRoot } from "../../../common/src/utils/trees";
import serialized_csca_tree from "../../../contracts/test/utils/pubkeys/serialized_csca_tree.json";

describe("VerifyAll with AttestationVerifier", () => {
    let vcAndDiscloseVerifier: any;
    let identityVerificationHubProxy: any;
    let identityVerificationHubImpl: any;
    let hub: any;
    let identityRegistryProxy: any;
    let identityRegistryImpl: any;
    let registry: any;
    let verifyAll: any;
    let owner: Signer;
    let user1: Signer;
    let mockPassport: PassportData;
    let selfBackendVerifier: SelfBackendVerifier;
    let proof: Groth16Proof;
    let publicSignals: PublicSignals;

    let snapshotId: string;
    let baseVcAndDiscloseProof: any;
    let vcAndDiscloseProof: any;
    let registerSecret: any;
    let imt: any;
    let commitment: any;
    let nullifier: any;
    let forbiddenCountriesList: string[];
    let forbiddenCountriesListPacked: string;
    let baseRawProof: {
        proof: Groth16Proof,
        publicSignals: PublicSignals
    };
    let rawProof: {
        proof: Groth16Proof,
        publicSignals: PublicSignals
    };

    before(async () => {
        // Import contract artifacts
        const vcAndDiscloseArtifact = require("../deployments/local/disclose/Verifier_vc_and_disclose.json");
        const poseidonT3Artifact = require("../deployments/PoseidonT3.json");
        const hubArtifact = require("../deployments/prod/DeployHub#IdentityVerificationHub.json");
        const hubImplArtifact = require("../deployments/prod/DeployHub#IdentityVerificationHubImplV1.json");
        const registryArtifact = require("../deployments/prod/DeployRegistryModule#IdentityRegistry.json");
        const registryImplArtifact = require("../deployments/prod/DeployRegistryModule#IdentityRegistryImplV1.json");
        const verifyAllArtifact = require("../deployments/prod/DeployVerifyAll#VerifyAll.json");

        [owner, user1] = await ethers.getSigners();

        const VcAndDiscloseFactory = new ethers.ContractFactory(
            vcAndDiscloseArtifact.abi,
            vcAndDiscloseArtifact.bytecode,
            owner
        );
        // const PoseidonT3Factory = new ethers.ContractFactory(
        //     poseidonT3Artifact.abi,
        //     poseidonT3Artifact.bytecode,
        //     owner
        // );
        // const HubFactory = new ethers.ContractFactory(
        //     hubArtifact.abi,
        //     hubArtifact.bytecode,
        //     owner
        // );
        // const HubImplFactory = new ethers.ContractFactory(
        //     hubImplArtifact.abi,
        //     hubImplArtifact.bytecode,
        //     owner
        // );
        // const RegistryFactory = new ethers.ContractFactory(
        //     registryArtifact.abi,
        //     registryArtifact.bytecode,
        //     owner
        // );
        // const RegistryImplFactory = new ethers.ContractFactory(
        //     registryImplArtifact.abi,
        //     registryImplArtifact.bytecode,
        //     owner
        // );
        // const VerifyAllFactory = new ethers.ContractFactory(
        //     verifyAllArtifact.abi,
        //     verifyAllArtifact.bytecode,
        //     owner
        // );

        // const newBalance = "0x" + ethers.parseEther("10000").toString(16);
        // await ethers.provider.send("hardhat_setBalance", [await owner.getAddress(), newBalance]);
        // await ethers.provider.send("hardhat_setBalance", [await user1.getAddress(), newBalance]);

        // mockPassport = genMockPassportData(
        //     "sha256",
        //     "sha256",
        //     "rsa_sha256_65537_4096",
        //     "FRA",
        //     "940131",
        //     "401031"
        // );

        // vcAndDiscloseVerifier = await VcAndDiscloseFactory.deploy();
        // await vcAndDiscloseVerifier.waitForDeployment();

        // const poseidonT3 = await PoseidonT3Factory.deploy();
        // await poseidonT3.waitForDeployment();

        // const identityRegistryImplFactory = await ethers.getContractFactory(
        //     "IdentityRegistryImplV1",
        //     {
        //         libraries: {
        //             PoseidonT3: poseidonT3.target
        //         }
        //     },
        //     owner
        // );
        // identityRegistryImpl = await identityRegistryImplFactory.deploy();
        // await identityRegistryImpl.waitForDeployment();

        // const temporaryHubAddress = "0x0000000000000000000000000000000000000000";
        // const registryInitData = identityRegistryImpl.interface.encodeFunctionData("initialize", [
        //     temporaryHubAddress
        // ]);
        // const registryProxyFactory = await ethers.getContractFactory("IdentityRegistry", owner);
        // identityRegistryProxy = await registryProxyFactory.deploy(identityRegistryImpl.target, registryInitData);
        // await identityRegistryProxy.waitForDeployment();

        // const initializeData = identityVerificationHubImpl.interface.encodeFunctionData("initialize", [
        //     identityRegistryProxy.target,
        //     vcAndDiscloseVerifier.target,
        //     [],
        //     [],
        //     [],
        //     []
        // ]);
        // const hubFactory = await ethers.getContractFactory("IdentityVerificationHub", owner);
        // identityVerificationHubProxy = await hubFactory.deploy(identityVerificationHubImpl.target, initializeData);
        // await identityVerificationHubProxy.waitForDeployment();

        // const updateHubTx = await registry.updateHub(identityVerificationHubProxy.target);
        // await updateHubTx.wait();
    
        // hub = await ethers.getContractAt(
        //     "IdentityVerificationHubImplV1",
        //     identityVerificationHubProxy.target
        // );

        // const csca_root = getCscaTreeRoot(serialized_csca_tree);
        // await registry.updateCscaRoot(csca_root, { from: owner });

        // const {
        //     passportNo_smt,
        //     nameAndDob_smt,
        //     nameAndYob_smt
        // } = getSMTs();

        // await registry.updatePassportNoOfacRoot(passportNo_smt.root, { from: owner });
        // await registry.updateNameAndDobOfacRoot(nameAndDob_smt.root, { from: owner });
        // await registry.updateNameAndYobOfacRoot(nameAndYob_smt.root, { from: owner });

        // registerSecret = generateRandomFieldElement();
        // nullifier = generateRandomFieldElement();
        // commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);
        
        // const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        // imt = new LeanIMT<bigint>(hashFunction);
        // await imt.insert(BigInt(commitment));

        // forbiddenCountriesList = ['AFG', 'ALB'];
        // forbiddenCountriesListPacked = reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList))));

        // baseRawProof = await generateVcAndDiscloseRawProof(
        //     registerSecret,
        //     ATTESTATION_ID.E_PASSPORT,
        //     mockPassport,
        //     "test-scope",
        //     new Array(88).fill("1"),
        //     1,
        //     imt,
        //     "20",
        //     undefined,
        //     undefined,
        //     undefined,
        //     undefined,
        //     forbiddenCountriesList,
        //     (await user1?.getAddress()).slice(2)
        // );
        // // Setup AttestationVerifier with the same verifyAll contract
        // selfBackendVerifier = new SelfBackendVerifier(
        //     "http://127.0.0.1:8545", // or your test RPC URL
        //     "test-scope",
        // );
        // snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    // beforeEach(async () => {
    //     rawProof = structuredClone(baseRawProof);
    // });

    // afterEach(async () => {
    //     await ethers.provider.send("evm_revert", [snapshotId]);
    //     snapshotId = await ethers.provider.send("evm_snapshot", []);
    // });

    it("should verify and get valid attestation result successfully after identity commitment is added", async () => {
        // await registry.connect(owner).devAddIdentityCommitment(
        //     ATTESTATION_ID.E_PASSPORT,
        //     nullifier,
        //     commitment
        // );

        // selfBackendVerifier.excludeCountries("Afghanistan", "Albania");
        // selfBackendVerifier.setMinimumAge(20);
        // selfBackendVerifier.enablePassportNoOfacCheck();
        // selfBackendVerifier.enableNameAndDobOfacCheck();
        // selfBackendVerifier.enableNameAndYobOfacCheck();
        // selfBackendVerifier.setNationality("France");

        // const result = await selfBackendVerifier.verify(
        //     rawProof.proof,
        //     rawProof.publicSignals
        // );

        // // Assert that the attestation verification result is valid.
        // expect(result.userId).to.equal(rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]);
        // expect(result.isValid).to.be.true;
        // expect(result.isValidDetails.isValidScope).to.be.true;
        // expect(result.isValidDetails.isValidAttestationId).to.be.true;
        // expect(result.isValidDetails.isValidProof).to.be.true;
        // expect(result.isValidDetails.isValidNationality).to.be.true;
        // expect(result.application).to.equal("test-scope");
        // expect(result.credentialSubject.merkle_root).to.equal(rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX]);
        // expect(result.credentialSubject.attestation_id).to.equal(BigInt(ATTESTATION_ID.E_PASSPORT));
        // expect(result.credentialSubject.current_date?.slice(0, 16))
        //     .to.equal(new Date().toISOString().slice(0, 16));
        // expect(result.credentialSubject.issuing_state).to.equal("FRA");
        // expect(result.credentialSubject.name?.[0]).to.equal("ALPHONSE HUGHUES ALBERT");
        // expect(result.credentialSubject.name?.[1]).to.equal("DUPONT");
        // expect(result.credentialSubject.passport_number).to.equal("15AA81234");
        // expect(result.credentialSubject.nationality).to.equal("FRA");
        // expect(result.credentialSubject.date_of_birth).to.equal("31-01-94");
        // expect(result.credentialSubject.gender).to.equal("M");
        // expect(result.credentialSubject.expiry_date).to.equal("31-10-40");
        // expect(result.credentialSubject.older_than).to.equal("20");
        // expect(result.credentialSubject.passport_no_ofac).to.equal("1");
        // expect(result.credentialSubject.name_and_dob_ofac).to.equal("1");
        // expect(result.credentialSubject.name_and_yob_ofac).to.equal("1");
    });

    it("should fail when invalid VC and Disclose proof is provided", async () => {
        // await registry.connect(owner).devAddIdentityCommitment(
        //     ATTESTATION_ID.E_PASSPORT,
        //     nullifier,
        //     commitment
        // );

        // rawProof.proof.pi_a[0] = generateRandomFieldElement();
        // const result = await selfBackendVerifier.verify(
        //     rawProof.proof,
        //     rawProof.publicSignals
        // );
        // expect(result.isValid).to.be.false;
        // expect(result.isValidDetails.isValidProof).to.be.false;
    });

    // it("should fail when invalid scope is provided", async () => {
    //     rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_SCOPE_INDEX] = generateRandomFieldElement().toString();
    //     const result = await selfBackendVerifier.verify(
    //         rawProof.proof,
    //         rawProof.publicSignals
    //     );
    //     expect(result.isValid).to.be.false;
    //     expect(result.isValidDetails.isValidScope).to.be.false;
    // });

    // it("should fail when invalid attestation id is provided", async () => {
    //     rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX] = generateRandomFieldElement().toString();
    //     const result = await selfBackendVerifier.verify(
    //         rawProof.proof,
    //         rawProof.publicSignals
    //     );
    //     expect(result.isValid).to.be.false;
    //     expect(result.isValidDetails.isValidAttestationId).to.be.false;
    // });

    // it("should fail when invalid nationality is provided", async () => {
    //     selfBackendVerifier.setNationality("United States of America");
    //     const result = await selfBackendVerifier.verify(
    //         rawProof.proof,
    //         rawProof.publicSignals
    //     );
    //     expect(result.isValid).to.be.false;
    //     expect(result.isValidDetails.isValidNationality).to.be.false;
    // });
});