import { ethers } from "hardhat";
import { Signer } from 'ethers';
import { expect } from "chai";
import { Context } from "mocha";
import { generateRandomFieldElement, splitHexFromBack } from "../../../contracts/test/utils/utils";
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
import fs from "fs";
import path from "path";
import { SMT, ChildNodes } from "@openpassport/zk-kit-smt";
import { getCscaTreeRoot } from "../../../common/src/utils/trees";
import serialized_csca_tree from "../../../contracts/test/utils/pubkeys/serialized_csca_tree.json";
import { identityVerificationHubImplV1Sol } from "../../../contracts/typechain-types/contracts";
import { verify } from "crypto";
import { registryAbi } from "../../../sdk/core/src/abi/IdentityRegistryImplV1";
import { verifyAllAbi } from "../../../sdk/core/src/abi/VerifyAll";

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
    let invalidForbiddenCountriesList: string[];
    let forbiddenCountriesListPacked: string[];
    let invalidForbiddenCountriesListPacked: string[];

    let baseRawProof: {
        proof: any,
        publicSignals: PublicSignals
    };
    let rawProof: {
        proof: any,
        publicSignals: PublicSignals
    };

    before(async () => {
        const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

        const vcAndDiscloseArtifact = require("../deployments/local/disclose/Verifier_vc_and_disclose.json");
        const poseidonT3Artifact = require("../deployments/PoseidonT3.json");
        const hubArtifact = require("../deployments/prod/DeployHub#IdentityVerificationHub.json");
        const hubImplArtifact = require("../deployments/prod/DeployHub#IdentityVerificationHubImplV1.json");
        const registryArtifact = require("../deployments/prod/DeployRegistryModule#IdentityRegistry.json");
        const registryImplArtifact = require("../deployments/prod/DeployRegistryModule#IdentityRegistryImplV1.json");
        const verifyAllArtifact = require("../deployments/prod/DeployVerifyAll#VerifyAll.json");

        [owner, user1] = await ethers.getSigners();
        owner = owner.connect(localProvider);
        user1 = user1.connect(localProvider);

        const newBalance = "0x" + ethers.parseEther("10000").toString(16);
        await ethers.provider.send("hardhat_setBalance", [await owner.getAddress(), newBalance]);
        await ethers.provider.send("hardhat_setBalance", [await user1.getAddress(), newBalance]);

        const VcAndDiscloseFactory = new ethers.ContractFactory(
            vcAndDiscloseArtifact.abi,
            vcAndDiscloseArtifact.bytecode,
            owner
        );
        vcAndDiscloseVerifier = await VcAndDiscloseFactory.deploy();
        await vcAndDiscloseVerifier.waitForDeployment();

        const PoseidonT3Factory = new ethers.ContractFactory(
            poseidonT3Artifact.abi,
            poseidonT3Artifact.bytecode,
            owner
        );
        const poseidonT3 = await PoseidonT3Factory.deploy();
        await poseidonT3.waitForDeployment();

        const libraries = {
            PoseidonT3: await poseidonT3.getAddress()
        };
        const linkedBytecode = linkLibraries(registryImplArtifact.bytecode, registryImplArtifact.linkReferences, libraries);
        const RegistryImplFactory = new ethers.ContractFactory(
            registryImplArtifact.abi,
            linkedBytecode,
            owner
        );
        identityRegistryImpl = await RegistryImplFactory.deploy();
        await identityRegistryImpl.waitForDeployment();

        const RegistryFactory = new ethers.ContractFactory(
            registryArtifact.abi,
            registryArtifact.bytecode,
            owner
        );
        const temporaryHubAddress = "0x0000000000000000000000000000000000000000";
        const registryInitData = identityRegistryImpl.interface.encodeFunctionData("initialize", [
            temporaryHubAddress
        ]);
        identityRegistryProxy = await RegistryFactory.deploy(
            identityRegistryImpl.target,
            registryInitData
        );
        await identityRegistryProxy.waitForDeployment();

        const HubImplFactory = new ethers.ContractFactory(
            hubImplArtifact.abi,
            hubImplArtifact.bytecode,
            owner
        );
        identityVerificationHubImpl = await HubImplFactory.deploy();
        await identityVerificationHubImpl.waitForDeployment();

        const initializeData = identityVerificationHubImpl.interface.encodeFunctionData("initialize", [
            identityRegistryProxy.target,
            vcAndDiscloseVerifier.target,
            [],
            [],
            [],
            []
        ]);
        const HubFactory = new ethers.ContractFactory(
            hubArtifact.abi,
            hubArtifact.bytecode,
            owner
        );
        identityVerificationHubProxy = await HubFactory.deploy(
            identityVerificationHubImpl.target,
            initializeData
        );
        await identityVerificationHubProxy.waitForDeployment();

        const VerifyAllFactory = new ethers.ContractFactory(
            verifyAllAbi,
            verifyAllArtifact.bytecode,
            owner
        );
        verifyAll = await VerifyAllFactory.deploy(
            identityVerificationHubProxy.target,
            identityRegistryProxy.target
        );
        await verifyAll.waitForDeployment();

        hub = await ethers.getContractAt(
            hubImplArtifact.abi,
            identityVerificationHubProxy.target,
        );

        registry = new ethers.Contract(
            identityRegistryProxy.target,
            registryAbi,
            owner
        );

        mockPassport = genMockPassportData(
            "sha256",
            "sha256",
            "rsa_sha256_65537_4096",
            "FRA",
            "940131",
            "401031"
        );

        const updateHubTx = await registry.updateHub(identityVerificationHubProxy.target);
        await updateHubTx.wait();

        const csca_root = getCscaTreeRoot(serialized_csca_tree);
        await registry.updateCscaRoot(csca_root, { from: owner });

        const {
            passportNo_smt,
            nameAndDob_smt,
            nameAndYob_smt
        } = getSMTs();

        await registry.updatePassportNoOfacRoot(passportNo_smt.root, { from: owner });
        await registry.updateNameAndDobOfacRoot(nameAndDob_smt.root, { from: owner });
        await registry.updateNameAndYobOfacRoot(nameAndYob_smt.root, { from: owner });

        registerSecret = generateRandomFieldElement();
        nullifier = generateRandomFieldElement();
        commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);
        
        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        forbiddenCountriesList = ['AAA', 'ABC', 'CBA', 'AAA', 'AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA','AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA','AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA','AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA', 'AAA', 'ABC', 'CBA'];
        const wholePacked = reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList))));
        forbiddenCountriesListPacked = splitHexFromBack(wholePacked);

        const generatedProof = await generateVcAndDiscloseRawProof(
            registerSecret,
            ATTESTATION_ID.E_PASSPORT,
            mockPassport,
            "test-scope",
            new Array(88).fill("1"),
            1,
            imt,
            "20",
            passportNo_smt,
            nameAndDob_smt,
            nameAndYob_smt,
            undefined,
            forbiddenCountriesListPacked,
            (await user1?.getAddress()).slice(2),
            "../../circuits/build/disclose/vc_and_disclose/vc_and_disclose_js/vc_and_disclose.wasm",
            "../../circuits/build/disclose/vc_and_disclose/vc_and_disclose_final.zkey",
            "../../circuits/build/disclose/vc_and_disclose/vc_and_disclose_vkey.json"
        );

        baseRawProof = {
            "proof": {
                a: generatedProof.proof.pi_a,
                b: generatedProof.proof.pi_b,
                c: generatedProof.proof.pi_c
            },
            "publicSignals": generatedProof.publicSignals
        }

        selfBackendVerifier = new SelfBackendVerifier(
            "http://127.0.0.1:8545",
            "test-scope",
            "hex",
            identityRegistryProxy.target,
            verifyAll.target
        );
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    beforeEach(async () => {
        rawProof = structuredClone(baseRawProof);
    });

    afterEach(async () => {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    it("should verify and get valid attestation result successfully after identity commitment is added", async () => {
        selfBackendVerifier.excludeCountries("Afghanistan", "Albania");
        selfBackendVerifier.setMinimumAge(20);
        selfBackendVerifier.enablePassportNoOfacCheck();
        selfBackendVerifier.enableNameAndDobOfacCheck();
        selfBackendVerifier.enableNameAndYobOfacCheck();
        selfBackendVerifier.setNationality("France");

        const result = await selfBackendVerifier.verify(
            rawProof.proof,
            rawProof.publicSignals
        );
        console.log("result: ", result);

        expect(result.userId.toLowerCase()).to.equal((await user1.getAddress()).toLowerCase());
        expect(result.isValid).to.be.true;
        expect(result.isValidDetails.isValidScope).to.be.true;
        expect(result.isValidDetails.isValidAttestationId).to.be.true;
        expect(result.isValidDetails.isValidProof).to.be.true;
        expect(result.isValidDetails.isValidNationality).to.be.true;
        expect(result.application).to.equal("test-scope");
        expect(result.credentialSubject.merkle_root).to.equal(rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX]);
        expect(result.credentialSubject.attestation_id).to.equal(BigInt(ATTESTATION_ID.E_PASSPORT));
        expect(result.credentialSubject.current_date?.slice(0, 16))
            .to.equal(new Date().toISOString().slice(0, 16));
        expect(result.credentialSubject.issuing_state).to.equal("FRA");
        expect(result.credentialSubject.name?.[0]).to.equal("ALPHONSE HUGHUES ALBERT");
        expect(result.credentialSubject.name?.[1]).to.equal("DUPONT");
        expect(result.credentialSubject.passport_number).to.equal("15AA81234");
        expect(result.credentialSubject.nationality).to.equal("FRA");
        expect(result.credentialSubject.date_of_birth).to.equal("31-01-94");
        expect(result.credentialSubject.gender).to.equal("M");
        expect(result.credentialSubject.expiry_date).to.equal("31-10-40");
        expect(result.credentialSubject.older_than).to.equal("20");
        expect(result.credentialSubject.passport_no_ofac).to.equal("1");
        expect(result.credentialSubject.name_and_dob_ofac).to.equal("1");
        expect(result.credentialSubject.name_and_yob_ofac).to.equal("1");
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

function linkLibraries(bytecode, linkReferences, libraries) {
    let linkedBytecode = bytecode;
    for (const file in linkReferences) {
      const libs = linkReferences[file];

      for (const libName in libs) {
        if (!libraries[libName]) {
          throw new Error(`Address is not provided for this library: ${libName}`);
        }

        const libAddress = libraries[libName].replace(/^0x/, '');
        const references = libs[libName];
        for (const ref of references) {
          const startPos = ref.start * 2 + 2;
          const len = ref.length * 2;
          let paddedAddress = libAddress;
          while (paddedAddress.length < len) {
            paddedAddress = '0' + paddedAddress;
          }
          linkedBytecode =
            linkedBytecode.substring(0, startPos) +
            paddedAddress +
            linkedBytecode.substring(startPos + len);
        }
      }
    }
    return linkedBytecode;
}

export function getSMTs() {    
    const passportNo_smt = importSMTFromJsonFile("../../common/ofacdata/outputs/passportNoAndNationalitySMT.json") as SMT;
    const nameAndDob_smt = importSMTFromJsonFile("../../common/ofacdata/outputs/nameAndDobSMT.json") as SMT;
    const nameAndYob_smt = importSMTFromJsonFile("../../common/ofacdata/outputs/nameAndYobSMT.json") as SMT;

    return {
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt
    };
}

function importSMTFromJsonFile(filePath?: string): SMT | null {
    try {
        const jsonString = fs.readFileSync(path.resolve(process.cwd(), filePath as string), 'utf8');
          
        const data = JSON.parse(jsonString);
          
        const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes));
        const smt = new SMT(hash2, true);
        smt.import(data);
          
        return smt;
    } catch (error) {
        console.error('Failed to import SMT from JSON file:', error);
        return null;
    }
}