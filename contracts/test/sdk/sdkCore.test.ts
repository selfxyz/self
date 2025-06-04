// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { deploySystemFixtures } from "../utils/deployment";
// import { DeployedActors } from "../utils/types";
// import { generateRandomFieldElement } from "../utils/utils";
// import { generateCommitment } from "@selfxyz/common/utils/passports/passport";
// import { ATTESTATION_ID } from "../utils/constants";
// import { CIRCUIT_CONSTANTS } from "@selfxyz/common/constants/constants";
// import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
// import { poseidon2 } from "poseidon-lite";
// import { generateVcAndDiscloseRawProof, parseSolidityCalldata } from "../utils/generateProof";
// import { Formatter } from "../utils/formatter";
// import { formatCountriesList, reverseBytes } from "@selfxyz/common/utils/circuits/formatInputs";
// import { VerifyAll } from "../../typechain-types";
// import { SelfBackendVerifier } from "../../../sdk/core/src/SelfBackendVerifier";
// import { Groth16Proof, PublicSignals, groth16 } from "snarkjs";
// import { VcAndDiscloseProof } from "../utils/types";
// import { hasSubscribers } from "diagnostics_channel";

// describe("VerifyAll with AttestationVerifier", () => {
//     let selfBackendVerifier: SelfBackendVerifier;
//     let proof: Groth16Proof;
//     let publicSignals: PublicSignals;
//     let deployedActors: DeployedActors;
//     let verifyAll: VerifyAll;
//     let snapshotId: string;
//     let baseVcAndDiscloseProof: any;
//     let vcAndDiscloseProof: any;
//     let registerSecret: any;
//     let imt: any;
//     let commitment: any;
//     let nullifier: any;
//     let forbiddenCountriesList: string[];
//     let forbiddenCountriesListPacked: string;
//     let baseRawProof: {
//         proof: Groth16Proof,
//         publicSignals: PublicSignals
//     };
//     let rawProof: {
//         proof: Groth16Proof,
//         publicSignals: PublicSignals
//     };

//     before(async () => {

//         deployedActors = await deploySystemFixtures();
//         const VerifyAllFactory = await ethers.getContractFactory("VerifyAll");
//         verifyAll = await VerifyAllFactory.deploy(
//             deployedActors.hub.getAddress(),
//             deployedActors.registry.getAddress()
//         );

//         registerSecret = generateRandomFieldElement();
//         nullifier = generateRandomFieldElement();
//         commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

//         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
//         imt = new LeanIMT<bigint>(hashFunction);
//         await imt.insert(BigInt(commitment));

//         forbiddenCountriesList = ['AFG', 'ALB'];
//         forbiddenCountriesListPacked = reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList))));

//         baseRawProof = await generateVcAndDiscloseRawProof(
//             registerSecret,
//             ATTESTATION_ID.E_PASSPORT,
//             deployedActors.mockPassport,
//             "test-scope",
//             new Array(88).fill("1"),
//             1,
//             imt,
//             "20",
//             undefined,
//             undefined,
//             undefined,
//             undefined,
//             forbiddenCountriesList,
//             (await deployedActors.user1?.getAddress()).slice(2)
//         );
//         // Setup AttestationVerifier with the same verifyAll contract
//         selfBackendVerifier = new SelfBackendVerifier(
//             "http://127.0.0.1:8545", // or your test RPC URL
//             "test-scope",
//             await deployedActors.registry.getAddress() as `0x${string}`,
//             await verifyAll.getAddress() as `0x${string}`,
//         );
//         snapshotId = await ethers.provider.send("evm_snapshot", []);
//     });

//     beforeEach(async () => {
//         rawProof = structuredClone(baseRawProof);
//     });

//     afterEach(async () => {
//         await ethers.provider.send("evm_revert", [snapshotId]);
//         snapshotId = await ethers.provider.send("evm_snapshot", []);
//     });

//     it("should verify and get valid attestation result successfully after identity commitment is added", async () => {
//         const { registry, owner } = deployedActors;

//         await registry.connect(owner).devAddIdentityCommitment(
//             ATTESTATION_ID.E_PASSPORT,
//             nullifier,
//             commitment
//         );

//         selfBackendVerifier.excludeCountries("Afghanistan", "Albania");
//         selfBackendVerifier.setMinimumAge(20);
//         selfBackendVerifier.enablePassportNoOfacCheck();
//         selfBackendVerifier.enableNameAndDobOfacCheck();
//         selfBackendVerifier.enableNameAndYobOfacCheck();
//         selfBackendVerifier.setNationality("France");
//         selfBackendVerifier.setTargetRootTimestamp(0);

//         const result = await selfBackendVerifier.verify(
//             rawProof.proof,
//             rawProof.publicSignals
//         );

//         // Assert that the attestation verification result is valid.
//         expect(result.userId).to.equal(rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]);
//         expect(result.isValid).to.be.true;
//         expect(result.isValidDetails.isValidScope).to.be.true;
//         expect(result.isValidDetails.isValidAttestationId).to.be.true;
//         expect(result.isValidDetails.isValidProof).to.be.true;
//         expect(result.isValidDetails.isValidNationality).to.be.true;
//         expect(result.application).to.equal("test-scope");
//         expect(result.credentialSubject.merkle_root).to.equal(rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX]);
//         expect(result.credentialSubject.attestation_id).to.equal(BigInt(ATTESTATION_ID.E_PASSPORT));
//         expect(result.credentialSubject.current_date?.slice(0, 16))
//             .to.equal(new Date().toISOString().slice(0, 16));
//         expect(result.credentialSubject.issuing_state).to.equal("FRA");
//         expect(result.credentialSubject.name?.[0]).to.equal("ALPHONSE HUGHUES ALBERT");
//         expect(result.credentialSubject.name?.[1]).to.equal("DUPONT");
//         expect(result.credentialSubject.passport_number).to.equal("15AA81234");
//         expect(result.credentialSubject.nationality).to.equal("FRA");
//         expect(result.credentialSubject.date_of_birth).to.equal("31-01-94");
//         expect(result.credentialSubject.gender).to.equal("M");
//         expect(result.credentialSubject.expiry_date).to.equal("31-10-40");
//         expect(result.credentialSubject.older_than).to.equal("20");
//         expect(result.credentialSubject.passport_no_ofac).to.equal("1");
//         expect(result.credentialSubject.name_and_dob_ofac).to.equal("1");
//         expect(result.credentialSubject.name_and_yob_ofac).to.equal("1");
//     });

//     it("should fail when invalid VC and Disclose proof is provided", async () => {
//         const { registry, owner, hub } = deployedActors;
//         await registry.connect(owner).devAddIdentityCommitment(
//             ATTESTATION_ID.E_PASSPORT,
//             nullifier,
//             commitment
//         );

//         rawProof.proof.pi_a[0] = generateRandomFieldElement();
//         const result = await selfBackendVerifier.verify(
//             rawProof.proof,
//             rawProof.publicSignals
//         );
//         expect(result.isValid).to.be.false;
//         expect(result.isValidDetails.isValidProof).to.be.false;
//     });

//     it("should fail when invalid scope is provided", async () => {
//         rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_SCOPE_INDEX] = generateRandomFieldElement().toString();
//         const result = await selfBackendVerifier.verify(
//             rawProof.proof,
//             rawProof.publicSignals
//         );
//         expect(result.isValid).to.be.false;
//         expect(result.isValidDetails.isValidScope).to.be.false;
//     });

//     it("should fail when invalid attestation id is provided", async () => {
//         rawProof.publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX] = generateRandomFieldElement().toString();
//         const result = await selfBackendVerifier.verify(
//             rawProof.proof,
//             rawProof.publicSignals
//         );
//         expect(result.isValid).to.be.false;
//         expect(result.isValidDetails.isValidAttestationId).to.be.false;
//     });

//     it("should fail when invalid nationality is provided", async () => {
//         selfBackendVerifier.setNationality("United States of America");
//         const result = await selfBackendVerifier.verify(
//             rawProof.proof,
//             rawProof.publicSignals
//         );
//         expect(result.isValid).to.be.false;
//         expect(result.isValidDetails.isValidNationality).to.be.false;
//     });
// });
