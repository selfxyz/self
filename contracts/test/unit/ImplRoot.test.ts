import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

describe("ImplRoot", () => {
    let mockImplRoot: any;
    let owner: any;
    let user1: any;

    beforeEach(async () => {
        [owner, user1] = await ethers.getSigners();
        
        const MockImplRootFactory = await ethers.getContractFactory("MockImplRoot", owner);
        mockImplRoot = await MockImplRootFactory.deploy();
        await mockImplRoot.waitForDeployment();
    });

    describe("Initialization", () => {
        it("should revert when calling __ImplRoot_init outside initialization phase", async () => {
            await expect(
                mockImplRoot.exposed__ImplRoot_init()
            ).to.be.revertedWithCustomError(mockImplRoot, "NotInitializing");
        });

        it("should revert when initializing with zero address owner", async () => {
            await expect(
                mockImplRoot.exposed__Ownable_init(ZeroAddress)
            ).to.be.revertedWithCustomError(mockImplRoot, "OwnableInvalidOwner")
            .withArgs(ZeroAddress);
        });

        it("should set correct owner when initializing with valid address", async () => {
            await mockImplRoot.exposed__Ownable_init(owner.address);
            expect(await mockImplRoot.owner()).to.equal(owner.address);
        });
    });
}); 