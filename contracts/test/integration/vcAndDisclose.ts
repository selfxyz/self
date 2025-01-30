import { expect } from "chai";
import { deploySystemFixtures } from "../utils/deployment";
import { DeployedActors } from "../utils/types";
import { ethers } from "hardhat";
import { generateDscSecret } from "../../../common/src/utils/csca";
import { CIRCUIT_CONSTANTS } from "../utils/constants";
import { RegisterVerifierId, DscVerifierId } from "../../../common/src/constants/constants";
import { PassportProof, VcAndDiscloseHubProof } from "../utils/types";
import { ATTESTATION_ID } from "../utils/constants";
import { generateRegisterProof, generateDscProof, generateVcAndDiscloseProof } from "../utils/generateProof";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "../../../common/src/utils/passports/passport";
import { BigNumberish } from "ethers";
import { generateRandomFieldElement } from "../utils/utils";
import { SMT, ChildNodes } from "@openpassport/zk-kit-smt";
describe("VC and Disclose", () => {
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

    // describe("Verify VC and Disclose", () => {
    //     it("should verify and get result successfully", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         // Verify and get result
    //         const result = await hub.verifyVcAndDisclose(vcAndDiscloseHubProof);

    //         // // Verify the returned results
    //         expect(result.revealedDataPacked).to.have.lengthOf(3);
    //         expect(result.nullifier).to.equal(vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NULLIFIER_INDEX]);
    //         expect(result.attestationId).to.equal(vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]);
    //         expect(result.userIdentifier).to.equal(vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]);
    //         expect(result.scope).to.equal(vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_SCOPE_INDEX]);
    //     });

    //     it("should fail with invalid identity commitment root", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];
    //         vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX] = generateRandomFieldElement();

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         // Verify and get result
    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_COMMITMENT_ROOT");
    //     });

    //     it("should fail with invalid OFAC root", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];
    //         vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_SMT_ROOT_INDEX] = generateRandomFieldElement();

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_OFAC_ROOT");
    //     });

    //     it("should fail with invalid current date (+ 1 day)", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         const currentBlock = await ethers.provider.getBlock('latest');
    //         const oneDayAfter = (currentBlock!.timestamp - 24 * 60 * 60 + 1);
            
    //         // Convert timestamp to 6 digits YYMMDD format
    //         const date = new Date(oneDayAfter * 1000);
    //         const dateComponents = [
    //             Math.floor((date.getUTCFullYear() % 100) / 10),
    //             date.getUTCFullYear() % 10,                    
    //             Math.floor((date.getUTCMonth() + 1) / 10),     
    //             (date.getUTCMonth() + 1) % 10,                 
    //             Math.floor(date.getUTCDate() / 10),            
    //             date.getUTCDate() % 10                         
    //         ];

    //         for (let i = 0; i < 6; i++) {
    //             vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_CURRENT_DATE_INDEX + i] = dateComponents[i].toString();
    //         }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "CURRENT_DATE_NOT_IN_VALID_RANGE");
    //     });

    //     it("should fail with invalid current date (- 1 day)", async () => {
            
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         const currentBlock = await ethers.provider.getBlock('latest');
    //         const oneDayBefore = (currentBlock!.timestamp - 24 * 60 * 60 - 1);
            
    //         // Convert timestamp to 6 digits YYMMDD format
    //         const date = new Date(oneDayBefore * 1000);
    //         const dateComponents = [
    //             Math.floor((date.getUTCFullYear() % 100) / 10),
    //             date.getUTCFullYear() % 10,                    
    //             Math.floor((date.getUTCMonth() + 1) / 10),     
    //             (date.getUTCMonth() + 1) % 10,                 
    //             Math.floor(date.getUTCDate() / 10),            
    //             date.getUTCDate() % 10                         
    //         ];

    //         for (let i = 0; i < 6; i++) {
    //             vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_CURRENT_DATE_INDEX + i] = dateComponents[i].toString();
    //         }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "CURRENT_DATE_NOT_IN_VALID_RANGE");
    //     });

    //     it("should succeed with bigger value than older than", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "18",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.not.reverted;
    //     });

    //     it("should fail with invalid older than", async () => {
    //             const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //             // First register a passport commitment
    //             const registerSecret = generateRandomFieldElement();
    //             const nullifier = generateRandomFieldElement();

    //             // Set up IMT for the VC and Disclose proof
    //             const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //             await registry.connect(owner).devAddIdentityCommitment(
    //                 ATTESTATION_ID.E_PASSPORT,
    //                 nullifier,
    //                 commitment
    //                 );

    //             const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //             const imt = new LeanIMT<bigint>(hashFunction);
    //             await imt.insert(BigInt(commitment));
        
    //             // Generate VC and Disclose proof
    //             const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //                 registerSecret,
    //                 BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //                 mockPassport,
    //                 "test-scope",
    //                 new Array(88).fill("1"),
    //                 "1",
    //                 imt,
    //                 "18",
    //             );
    //             const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

    //             const vcAndDiscloseHubProof = {
    //                 olderThanEnabled: true,
    //                 olderThan: "20",
    //                 forbiddenCountriesEnabled: true,
    //                 forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //                 ofacEnabled: true,
    //                 vcAndDiscloseProof: vcAndDiscloseProof
    //             }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_OLDER_THAN");
    //     });

    //     it("should fail with if listed in OFAC", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes));
    //         const smt = new SMT(hash2, true);
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //             smt,
    //             "0",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_OFAC");
    //     });

    //     it("should fail with invalid forbidden countries", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //             );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));

    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = generateRandomFieldElement();

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_FORBIDDEN_COUNTRIES");
    //     });

    //     it("should fail with invalid VC and Disclose proof", async () => {
    //         const {hub, registry, owner, user1, mockPassport} = deployedActors;

    //         // First register a passport commitment
    //         const registerSecret = generateRandomFieldElement();
    //         const nullifier = generateRandomFieldElement();

    //         // Set up IMT for the VC and Disclose proof
    //         const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

    //         await registry.connect(owner).devAddIdentityCommitment(
    //             ATTESTATION_ID.E_PASSPORT,
    //             nullifier,
    //             commitment
    //         );

    //         const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //         const imt = new LeanIMT<bigint>(hashFunction);
    //         await imt.insert(BigInt(commitment));
    
    //         // Generate VC and Disclose proof
    //         const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //             registerSecret,
    //             BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    //             mockPassport,
    //             "test-scope",
    //             new Array(88).fill("1"),
    //             "1",
    //             imt,
    //             "20",
    //         );
    //         const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];
    //         vcAndDiscloseProof.a[0] = generateRandomFieldElement();

    //         const vcAndDiscloseHubProof = {
    //             olderThanEnabled: true,
    //             olderThan: "20",
    //             forbiddenCountriesEnabled: true,
    //             forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    //             ofacEnabled: true,
    //             vcAndDiscloseProof: vcAndDiscloseProof
    //         }

    //         await expect(
    //             hub.verifyVcAndDisclose(vcAndDiscloseHubProof)
    //         ).to.be.revertedWithCustomError(hub, "INVALID_VC_AND_DISCLOSE_PROOF");
    //     });
    // });

    describe("readable parsers", () => {
        it("should parse forbidden countries", async () => {
            const {hub, registry, owner, user1, mockPassport} = deployedActors;

            const registerSecret = generateRandomFieldElement();
            const nullifier = generateRandomFieldElement();

            // Set up IMT for the VC and Disclose proof
            const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);
            const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
            const imt = new LeanIMT<bigint>(hashFunction);
            await imt.insert(BigInt(commitment));
    
            // Generate VC and Disclose proof
            const vcAndDiscloseProof = await generateVcAndDiscloseProof(
                registerSecret,
                BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
                mockPassport,
                "test-scope",
                new Array(88).fill("1"),
                "1",
                imt,
                "20",
            );

            let revealedDataPacked = [BigInt(0), BigInt(0), BigInt(0)];
            for (let i = 0; i < 3; i++) {
                revealedDataPacked[i] = BigInt(vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX + i]);
            };
            const types = [0, 1, 2, 3, 4, 5, 6, 7];
            const readableData = await hub.getReadableRevealedData(
                revealedDataPacked as [BigNumberish, BigNumberish, BigNumberish],
                types
            );
            expect(readableData[0]).to.equal('FRA');
            expect(readableData[1]).to.equal('DUPONT<<ALPHONSE<HUGHUES<ALBERT<<<<<<<<');
            expect(readableData[2]).to.equal('15AA81234');
            expect(readableData[3]).to.equal('FRA');
            expect(readableData[4]).to.equal('940131');
            expect(readableData[5]).to.equal('M');
            expect(readableData[6]).to.equal('401031');
            expect(readableData[7]).to.equal(20n);
            expect(readableData[8]).to.equal(0n);
        });

        it("should parse forbidden countries", async () => {
            const {hub, registry, owner, user1, mockPassport} = deployedActors;

            const registerSecret = generateRandomFieldElement();
            const nullifier = generateRandomFieldElement();

            // Set up IMT for the VC and Disclose proof
            const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);
            const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
            const imt = new LeanIMT<bigint>(hashFunction);
            await imt.insert(BigInt(commitment));
    
            // Generate VC and Disclose proof
            const vcAndDiscloseProof = await generateVcAndDiscloseProof(
                registerSecret,
                BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
                mockPassport,
                "test-scope",
                new Array(88).fill("1"),
                "1",
                imt,
                "20",
            );

            const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];
            const readableForbiddenCountries = await hub.getReadableForbiddenCountries(forbiddenCountriesListPacked);
            expect(readableForbiddenCountries[0]).to.equal('AAA');
        });
    });
}); 