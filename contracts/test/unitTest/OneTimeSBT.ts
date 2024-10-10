import { ethers } from "hardhat";
import { expect } from "chai";
import { Block } from "ethers";
import { 
    generateMockRSAProveVerifierInputs,
    generateMockDSCVerifierInputs,
    convertProofTypeIntoInput
} from "../../../common/src/utils/test/generateMockProof";

const TRUE_VERIFIER_ID = 0;
const FALSE_VERIFIER_ID = 1;

describe("Unit test for OneTimeSBT.sol", function() {

    let verifiersManager: any;
    let formatter: any;
    let oneTimeSBT: any;

    let owner: any;
    let addr1: any;
    let addr2: any;

    let snapshotId: any;

    before(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();

        const verifiersManagerFactory = await ethers.getContractFactory("VerifiersManagerMock");
        verifiersManager = await verifiersManagerFactory.deploy();
        await verifiersManager.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_disclose deployed to ${verifiersManager.target}`);

        const formatterFactory = await ethers.getContractFactory("Formatter");
        formatter = await formatterFactory.deploy();
        await formatter.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `formatter deployed to ${formatter.target}`);

        const sbtFactory = await ethers.getContractFactory("OneTimeSBT");
        oneTimeSBT = await sbtFactory.deploy(
            verifiersManager,
            formatter
        );
        await oneTimeSBT.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `sbt deployed to ${oneTimeSBT.target}`);

        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    function removeNullCharacters(str: string): string {
        return str.replace(/\u0000/g, ''); // ヌル文字を削除
    }

    describe("Test mint function", async function () {

        it("Should revert if current time is +2 dyas", async function() {
            let twoDaysPassed = new Date();
            twoDaysPassed.setDate(twoDaysPassed.getDate() + 2);
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                current_date: twoDaysPassed
            });
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "CURRENT_DATE_NOT_IN_VALID_RANGE"
            );
        });
        it("Should revert if current time is -2 dyas", async function() {
            let twoDaysBefore = new Date();
            twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                current_date: twoDaysBefore
            });
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "CURRENT_DATE_NOT_IN_VALID_RANGE"
            );
        });

        it("Should revert if Blinded_dsc_commitment is not equal", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                blinded_dsc_commitment: "42"
            });
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({
                blinded_dsc_commitment: "43"
            });
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "UNEQUAL_BLINDED_DSC_COMMITMENT"
            );
        });

        it("Should revert if prove verifier returns false", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({});
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await expect(
                oneTimeSBT.mint(
                    FALSE_VERIFIER_ID,
                    TRUE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "INVALID_PROVE_PROOF"
            );
        });

        it("Should revert if dsc veriifier returns false", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({});
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await expect(
                oneTimeSBT.mint(
                    TRUE_VERIFIER_ID,
                    FALSE_VERIFIER_ID,
                    p_proof,
                    d_proof
                )
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "INVALID_DSC_PROOF"
            );
        });

        it("Should be able to mint after passed all validations and parameters are set correctly", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                revealedData_packed: [ 
                    "114847304187799599204038932047563106716216648531307757482805904045144161360",
                    "90441810240571260447108696195211715124097440720966537976235069762603139660",
                    "80649680061362283084530183871589323447324161052952025077985585"
                ],
                user_identifier: addr1.address
            });
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            let beforeTotalSupply = await oneTimeSBT.totalSupply();

            const tx = await oneTimeSBT.mint(
                TRUE_VERIFIER_ID,
                TRUE_VERIFIER_ID,
                p_proof,
                d_proof
            );
            const receipt = await tx.wait();

            let totalSupply = await oneTimeSBT.totalSupply();
            let thisTokenId = totalSupply - 1n;

            expect(totalSupply).to.be.equal(beforeTotalSupply + 1n);
            expect(await oneTimeSBT.ownerOf(thisTokenId)).to.be.equal(addr1.address);

            expect(await oneTimeSBT.getIssuingStateOf(thisTokenId)).to.be.equal("FRA");
            expect(removeNullCharacters(await oneTimeSBT.getNameOf(thisTokenId))).to.be.equal("DUPONTALPHONSEHUGHUESALBERT");
            expect(await oneTimeSBT.getPassportNumberOf(thisTokenId)).to.be.equal("15AA81234");
            expect(await oneTimeSBT.getNationalityOf(thisTokenId)).to.be.equal("FRA");
            expect(await oneTimeSBT.getDateOfBirthOf(thisTokenId)).to.be.equal("001031");
            expect(await oneTimeSBT.getGenderOf(thisTokenId)).to.be.equal("M");
            expect(await oneTimeSBT.getExpiryDateOf(thisTokenId)).to.be.equal("401010");
            expect(await oneTimeSBT.getOlderThanOf(thisTokenId)).to.be.equal("18");

            const mintBlockNumber = receipt.blockNumber;
            const mintBlock = await ethers.provider.getBlock(mintBlockNumber) as Block;
            const mintTimestamp = mintBlock.timestamp;
            const expectedExpiration = mintTimestamp + 90 * 24 * 60 * 60; // 90 days = 90 * 24 * 60 * 60 seconds
            expect(await oneTimeSBT.sbtExpiration(thisTokenId)).to.equal(expectedExpiration);
        });

    });

    describe("Test isSbtValid", async function () {

        it("Should be true before expiration", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({});
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await oneTimeSBT.mint(
                TRUE_VERIFIER_ID,
                TRUE_VERIFIER_ID,
                p_proof,
                d_proof
            );

            let totalSupply = await oneTimeSBT.totalSupply();
            let thisTokenId = totalSupply - 1n;

            expect(await oneTimeSBT.isSbtValid(thisTokenId)).to.be.equal(true);
        });

        it("Should be false at the expiration time", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({});
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await oneTimeSBT.mint(
                TRUE_VERIFIER_ID,
                TRUE_VERIFIER_ID,
                p_proof,
                d_proof
            );

            let totalSupply = await oneTimeSBT.totalSupply();
            let thisTokenId = totalSupply - 1n;

            const ninetyDaysInSeconds = 90 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [ninetyDaysInSeconds]);
            await ethers.provider.send("evm_mine", []);

            expect(await oneTimeSBT.isSbtValid(thisTokenId)).to.be.equal(false);
        });

        it("Should be false after expiration", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({});
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await oneTimeSBT.mint(
                TRUE_VERIFIER_ID,
                TRUE_VERIFIER_ID,
                p_proof,
                d_proof
            );

            let totalSupply = await oneTimeSBT.totalSupply();
            let thisTokenId = totalSupply - 1n;

            const oneEightyDaysInSeconds = 180 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [oneEightyDaysInSeconds]);
            await ethers.provider.send("evm_mine", []);

            expect(await oneTimeSBT.isSbtValid(thisTokenId)).to.be.equal(false);
        });
    });


    describe("Test transfer functions", async function() {

        it("Should not be able to transfer with transferFrom", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                user_identifier: addr1.address
            });
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await oneTimeSBT.mint(
                TRUE_VERIFIER_ID,
                TRUE_VERIFIER_ID,
                p_proof,
                d_proof
            );

            let totalSupply = await oneTimeSBT.totalSupply();
            let thisTokenId = totalSupply - 1n;

            await expect(
                oneTimeSBT.connect(addr1).transferFrom(addr1.address, addr2.address, thisTokenId)
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "SBT_CAN_NOT_BE_TRANSFERED"
            );
        });

        it("Should not be able to transfer with safeTransferFrom(address from, address to, uint256 tokenId)", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                user_identifier: addr1.address
            });
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await oneTimeSBT.mint(
                TRUE_VERIFIER_ID,
                TRUE_VERIFIER_ID,
                p_proof,
                d_proof
            );

            let totalSupply = await oneTimeSBT.totalSupply();
            let thisTokenId = totalSupply - 1n;

            await expect(
                oneTimeSBT.connect(addr1)["safeTransferFrom(address,address,uint256)"](addr1.address, addr2.address, thisTokenId)
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "SBT_CAN_NOT_BE_TRANSFERED"
            );
        });

        it("Should not be able to transfer with safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)", async function() {
            let mockRSAProveVerifierProof = generateMockRSAProveVerifierInputs({
                user_identifier: addr1.address
            });
            let p_proof = convertProofTypeIntoInput(mockRSAProveVerifierProof);

            let mockDscVerifierProof = generateMockDSCVerifierInputs({});
            let d_proof = convertProofTypeIntoInput(mockDscVerifierProof);

            await oneTimeSBT.mint(
                TRUE_VERIFIER_ID,
                TRUE_VERIFIER_ID,
                p_proof,
                d_proof
            );

            let totalSupply = await oneTimeSBT.totalSupply();
            let thisTokenId = totalSupply - 1n;

            await expect(
                oneTimeSBT.connect(addr1)["safeTransferFrom(address,address,uint256,bytes)"](addr1.address, addr2.address, thisTokenId, "0x")
            ).to.be.revertedWithCustomError(
                oneTimeSBT,
                "SBT_CAN_NOT_BE_TRANSFERED"
            );
        });

    });

});
