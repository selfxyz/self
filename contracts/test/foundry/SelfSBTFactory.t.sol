// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {SelfSBT} from "../../contracts/sbt/SelfSBT.sol";
import {SelfSBTFactory} from "../../contracts/sbt/SelfSBTFactory.sol";
import {SelfUtils} from "../../contracts/libraries/SelfUtils.sol";
import {MockIdentityVerificationHubV2} from "./SelfSBT.t.sol";

contract SelfSBTFactoryTest is Test {
    MockIdentityVerificationHubV2 hub;
    SelfSBTFactory factory;

    address deployer = makeAddr("deployer");

    function setUp() public {
        hub = new MockIdentityVerificationHubV2();
        factory = new SelfSBTFactory(address(hub));
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

    function testHubV2Immutable() public view {
        assertEq(factory.hubV2(), address(hub));
    }

    function testDeployCreatesSbtWithNameAndSymbol() public {
        address sbt = factory.deploy("factory-scope-seed", "Org SBT", "OSBT", _cfg());
        assertTrue(sbt != address(0));
        assertEq(SelfSBT(sbt).name(), "Org SBT");
        assertEq(SelfSBT(sbt).symbol(), "OSBT");
    }

    function testConfigRegisteredBySbtNotFactory() public {
        address sbt = factory.deploy("factory-scope-seed", "Org SBT", "OSBT", _cfg());
        assertEq(hub.setConfigCalls(), 1);
        assertEq(hub.lastConfigCaller(), sbt);
        bytes32 expected = sha256(abi.encode(SelfUtils.formatVerificationConfigV2(_cfg())));
        assertEq(SelfSBT(sbt).verificationConfigId(), expected);
    }

    function testSbtDeployedEventShape() public {
        vm.recordLogs();
        vm.prank(deployer);
        address sbt = factory.deploy("factory-scope-seed", "Org SBT", "OSBT", _cfg());

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
        address a = factory.deploy("seed-a", "A", "A", _cfg());
        address b = factory.deploy("seed-b", "B", "B", _cfg());
        assertTrue(a != b);
        assertEq(hub.setConfigCalls(), 2);
    }
}
