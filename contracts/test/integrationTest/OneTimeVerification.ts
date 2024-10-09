import { ethers } from "hardhat";
import { expect } from "chai";

describe("Test one time verification flow", async function () {

    let verifierProveRsa65537Sha256: any;
    let verifiersManager: any;
    let formatter: any;
    let oneTimeSBT: any;

    let owner: any;
    let addr1: any;
    let addr2: any;

    let snapshotId: any;

    before(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();

        const testMode = process.argv[2];

        let verifierProveRsa65537Sha256Factory: any;
        if (testMode === "--local") {
            verifierProveRsa65537Sha256Factory = await ethers.getContractFactory("contracts/verifiers/local/prove/Verifier_prove_rsa_65537_sha256.sol:Verifier_prove_rsa_65537_sha256");
        } else if (testMode === "--prod") {
            verifierProveRsa65537Sha256Factory = await ethers.getContractFactory("contracts/verifiers/prove/Verifier_prove_rsa_65537_sha256.sol:Verifier_prove_rsa_65537_sha256");
        }
        verifierProveRsa65537Sha256 = await verifierProveRsa65537Sha256Factory.deploy();
        await verifierProveRsa65537Sha256.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_prove_rsa_65537_sha256 deployed to ${verifierProveRsa65537Sha256.target}`);

        const verifiersManagerFactory = await ethers.getContractFactory("VerifiersManager");
        verifiersManager = await verifiersManagerFactory.deploy();
        await verifiersManager.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `VerfiersManager deployed to ${verifiersManager.target}`);

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
});