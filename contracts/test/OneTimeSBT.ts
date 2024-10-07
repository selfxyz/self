import { ethers } from "hardhat";
import { expect, assert } from "chai";
import { BigNumberish, Block, dataLength } from "ethers";
import { genMockPassportData } from "../../common/src/utils/genMockPassportData";
import { 
    generateCircuitInputsProve,
    generateCircuitInputsDisclose
} from "../../common/src/utils/generateInputs";
import { getCSCAModulusMerkleTree } from "../../common/src/utils/csca";
import { formatRoot } from "../../common/src/utils/utils";
import { IMT } from "../../common/node_modules/@zk-kit/imt";

describe("Unit test for OneTimeSBT.sol", function() {

    let verifiersManager: any;
    let formatter: any;
    let oneTimeSBT: any;

    let owner: any;
    let addr1: any;
    let addr2: any;

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
    });

    describe("Test mint function", async function () {

    });

    describe("Test util functions", async function () {

        describe("Test fieldElementsToBytes function", async function () {

        });

        describe("Test sliceFirstThree function", async function () {

        });

    })
});