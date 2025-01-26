import { expect } from "chai";
import { deploySystemFixtures } from "./utils/deployment";
import { DeployedActors } from "./utils/types";
import { ethers } from "hardhat";
import { generateDscSecret } from "../../common/src/utils/csca";
import { CONTRACT_CONSTANTS } from "./utils/constants";
import { RegisterVerifierId, DscVerifierId } from "../../common/src/constants/constants";

import { PassportProof } from "./utils/types";
import { ATTESTATION_ID } from "./utils/constants";

import { generateRegisterProof, generateDscProof } from "./utils/generateProof";

import { getCSCAModulusMerkleTree } from "../../common/src/utils/csca";

describe("VC and Disclose", () => {
    // it("should verify VC and Disclose proof", async () => {
    //     const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = await loadFixture(deploySystemFixtures);

    //     // First register a passport commitment
    //     const registerSecret = "1234567890";
    //     const dscSecret = generateDscSecret();

    //     const registerProof = await generateRegisterProof(
    //         registerSecret,
    //         dscSecret,
    //         mockPassport
    //     );

    //     const dscProof = await generateDscProof(
    //         dscSecret,
    //         mockPassport.dsc,
    //         1664,
    //     );

    //     const passportProof: PassportProof = {
    //         registerCircuitVerifierId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    //         dscCircuitVerifierId: DscVerifierId.dsc_rsa_sha256_65537_4096,
    //         registerCircuitProof: registerProof,
    //         dscCircuitProof: dscProof
    //     };

    //     await hub.verifyAndRegisterPassportCommitment(passportProof);

    //     // Set up IMT for the VC and Disclose proof
    //     const commitment = registerProof.pubSignals[CONTRACT_CONSTANTS.REGISTER_COMMITMENT_INDEX];
    //     const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    //     const imt = new LeanIMT<bigint>(hashFunction);
    //     imt.insert(BigInt(commitment));

    //     const root = await registry.getIdentityCommitmentMerkleRoot();
    //     expect(imt.root).to.equal(root);

    //     // Generate and verify VC and Disclose proof
    //     const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //         registerSecret,
    //         ATTESTATION_ID.E_PASSPORT,
    //         mockPassport,
    //         "scope",  
    //         new Array(93).fill("1"),
    //         "18",
    //         imt,          
    //         "20",
    //         undefined,
    //         "0",
    //         ["AAA"],
    //         "70997970C51812dc3A010C7d01b50e0d17dc79C8"
    //     );

    //     const result = await hub.verifyVcAndDiscloseAndGetMinimumResult(
    //         vcAndDiscloseProof,
    //     );

    //     expect(result.verified).to.be.true;
    //     expect(result.olderThan).to.be.true;
    //     expect(result.forbiddenCountries).to.be.true;
    //     expect(result.ofac).to.be.true;
    // });

    // it("should fail verification with invalid proof", async () => {
    //     const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = await loadFixture(deploySystemFixtures);

    //     // First register a passport commitment (same setup as above)
    //     // ... setup code ...

    //     const vcAndDiscloseProof = await generateVcAndDiscloseProof(/* ... */);
        
    //     // Modify the proof to make it invalid
    //     vcAndDiscloseProof.vcAndDiscloseProof.a[0] = "123456789";

    //     await expect(
    //         hub.verifyVcAndDiscloseAndGetMinimumResult(vcAndDiscloseProof)
    //     ).to.be.revertedWithCustomError(hub, "INVALID_VC_AND_DISCLOSE_PROOF");
    // });

    // it("should fail verification with unregistered commitment", async () => {
    //     const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = await loadFixture(deploySystemFixtures);

    //     // Generate proof without registering commitment first
    //     const imt = new LeanIMT<bigint>((a: bigint, b: bigint) => poseidon2([a, b]));
        
    //     const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //         "1234567890",
    //         ATTESTATION_ID.E_PASSPORT,
    //         mockPassport,
    //         "scope",
    //         new Array(93).fill("1"),
    //         "18",
    //         imt,
    //         "20",
    //         undefined,
    //         "0",
    //         ["AAA"],
    //         "70997970C51812dc3A010C7d01b50e0d17dc79C8"
    //     );

    //     await expect(
    //         hub.verifyVcAndDiscloseAndGetMinimumResult(vcAndDiscloseProof)
    //     ).to.be.revertedWithCustomError(hub, "INVALID_IDENTITY_COMMITMENT");
    // });

    // it("should fail verification when age requirement not met", async () => {
    //     const {hub, registry, vcAndDisclose, register, dsc, owner, user1, mockPassport} = await loadFixture(deploySystemFixtures);

    //     // ... setup code for registration ...

    //     const vcAndDiscloseProof = await generateVcAndDiscloseProof(
    //         // ... same parameters but with lower age ...
    //         "25", // Set higher age requirement
    //         // ... rest of parameters
    //     );

    //     const result = await hub.verifyVcAndDiscloseAndGetMinimumResult(vcAndDiscloseProof);
    //     expect(result.olderThan).to.be.false;
    // });
}); 