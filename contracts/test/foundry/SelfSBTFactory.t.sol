// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {SelfSBT} from "../../contracts/sbt/SelfSBT.sol";
import {SelfSBTFactory} from "../../contracts/sbt/SelfSBTFactory.sol";
import {SelfUtils} from "../../contracts/libraries/SelfUtils.sol";
import {MockIdentityVerificationHubV2} from "./SelfSBT.t.sol";

contract SelfSBTFactoryTest is Test {
    MockIdentityVerificationHubV2 hub;
    SelfSBTFactory factory;

    address deployer = makeAddr("deployer");
    address stranger = makeAddr("stranger");

    function setUp() public {
        hub = new MockIdentityVerificationHubV2();
        factory = new SelfSBTFactory(address(hub), deployer);
    }

    function _cfg() internal pure returns (SelfUtils.UnformattedVerificationConfigV2 memory cfg) {
        string[] memory forbidden = new string[](1);
        forbidden[0] = "IRN";
        cfg = SelfUtils.UnformattedVerificationConfigV2({
            olderThan: 21,
            forbiddenCountries: forbidden,
            ofacEnabled: true
        });
    }

    function _deploy(string memory seed, string memory name_, string memory symbol_) internal returns (address) {
        vm.prank(deployer);
        return factory.deploy(seed, name_, symbol_, _cfg());
    }

    function testHubV2Immutable() public view {
        assertEq(factory.hubV2(), address(hub));
    }

    function testOwnerSetAtConstruction() public view {
        assertEq(factory.owner(), deployer);
    }

    function testNonOwnerDeployReverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        factory.deploy("factory-scope-seed", "Org SBT", "OSBT", _cfg());
    }

    function testDeployCreatesSbtWithNameAndSymbol() public {
        address sbt = _deploy("factory-scope-seed", "Org SBT", "OSBT");
        assertTrue(sbt != address(0));
        assertEq(SelfSBT(sbt).name(), "Org SBT");
        assertEq(SelfSBT(sbt).symbol(), "OSBT");
    }

    function testConfigRegisteredBySbtNotFactory() public {
        address sbt = _deploy("factory-scope-seed", "Org SBT", "OSBT");
        assertEq(hub.setConfigCalls(), 1);
        assertEq(hub.lastConfigCaller(), sbt);
        bytes32 expected = sha256(abi.encode(SelfUtils.formatVerificationConfigV2(_cfg())));
        assertEq(SelfSBT(sbt).verificationConfigId(), expected);
    }

    function testSbtDeployedEventShape() public {
        vm.recordLogs();
        address sbt = _deploy("factory-scope-seed", "Org SBT", "OSBT");

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 sig = keccak256("SBTDeployed(address,uint256,address)");
        bool found = false;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter != address(factory) || logs[i].topics[0] != sig) continue;
            found = true;
            assertEq(address(uint160(uint256(logs[i].topics[1]))), sbt);
            assertEq(address(uint160(uint256(logs[i].topics[2]))), deployer);
            assertEq(abi.decode(logs[i].data, (uint256)), SelfSBT(sbt).scope());
        }
        assertTrue(found, "SBTDeployed not emitted by factory");
    }

    function testEachDeployIsIndependent() public {
        address a = _deploy("seed-a", "A", "A");
        address b = _deploy("seed-b", "B", "B");
        assertTrue(a != b);
        assertEq(hub.setConfigCalls(), 2);
    }
}
