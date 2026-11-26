// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ProxyRoot} from "../../contracts/upgradeable/ProxyRoot.sol";
import {IdentityVerificationHub} from "../../contracts/IdentityVerificationHub.sol";
import {IdentityVerificationHubImplV2} from "../../contracts/IdentityVerificationHubImplV2.sol";
import {IdentityRegistry} from "../../contracts/registry/IdentityRegistry.sol";
import {IdentityRegistryImplV1} from "../../contracts/registry/IdentityRegistryImplV1.sol";
import {IdentityRegistryIdCardImplV1} from "../../contracts/registry/IdentityRegistryIdCardImplV1.sol";
import {IdentityRegistryAadhaarImplV1} from "../../contracts/registry/IdentityRegistryAadhaarImplV1.sol";
import {IdentityRegistryKycImplV1} from "../../contracts/registry/IdentityRegistryKycImplV1.sol";

/**
 * @title GovernanceInitAccessTest
 * @notice Initialization and role-assignment invariants for the Hub and registry proxies:
 *         - proxies cannot be deployed without initialization data;
 *         - after deployment, and after a code-only upgrade, no external initializer can be run by
 *           an address without SECURITY_ROLE, on the proxy or on the implementation;
 *         - only the deployer holds SECURITY_ROLE / OPERATIONS_ROLE after initialization.
 *
 * Run with: forge test --match-contract GovernanceInitAccessTest -vvv
 */
contract GovernanceInitAccessTest is Test {
    bytes32 internal constant SECURITY_ROLE = keccak256("SECURITY_ROLE");
    bytes32 internal constant OPERATIONS_ROLE = keccak256("OPERATIONS_ROLE");
    // OpenZeppelin v5 Initializable storage: keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant INITIALIZABLE_SLOT = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    address internal deployer = makeAddr("deployer");
    address internal attacker = makeAddr("attacker");
    address internal hubAddr = makeAddr("hub");
    address internal pcr0Manager = makeAddr("pcr0Manager");

    struct Target {
        string name;
        address impl;
        bytes initData;
        uint64 expectedVersion;
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    function _hub() internal returns (Target memory t) {
        t.name = "IdentityVerificationHubImplV2";
        t.impl = address(new IdentityVerificationHubImplV2());
        t.initData = abi.encodeCall(IdentityVerificationHubImplV2.initialize, ());
        t.expectedVersion = 11;
    }

    function _passport() internal returns (Target memory t) {
        t.name = "IdentityRegistryImplV1";
        t.impl = address(new IdentityRegistryImplV1());
        t.initData = abi.encodeCall(IdentityRegistryImplV1.initialize, (hubAddr));
        t.expectedVersion = 1;
    }

    function _idCard() internal returns (Target memory t) {
        t.name = "IdentityRegistryIdCardImplV1";
        t.impl = address(new IdentityRegistryIdCardImplV1());
        t.initData = abi.encodeCall(IdentityRegistryIdCardImplV1.initialize, (hubAddr));
        t.expectedVersion = 1;
    }

    function _aadhaar() internal returns (Target memory t) {
        t.name = "IdentityRegistryAadhaarImplV1";
        t.impl = address(new IdentityRegistryAadhaarImplV1());
        t.initData = abi.encodeCall(IdentityRegistryAadhaarImplV1.initialize, (hubAddr));
        t.expectedVersion = 1;
    }

    function _kyc() internal returns (Target memory t) {
        t.name = "IdentityRegistryKycImplV1";
        t.impl = address(new IdentityRegistryKycImplV1());
        t.initData = abi.encodeCall(IdentityRegistryKycImplV1.initialize, (hubAddr, pcr0Manager));
        t.expectedVersion = 1;
    }

    function _targets() internal returns (Target[5] memory ts) {
        ts[0] = _hub();
        ts[1] = _passport();
        ts[2] = _idCard();
        ts[3] = _aadhaar();
        ts[4] = _kyc();
    }

    function _deploy(Target memory t) internal returns (address proxy) {
        vm.prank(deployer);
        proxy = address(new ProxyRoot(t.impl, t.initData));
    }

    function _initializedVersion(address proxy) internal view returns (uint64) {
        return uint64(uint256(vm.load(proxy, INITIALIZABLE_SLOT)));
    }

    /// Every external entry point that has ever carried an initializer/reinitializer modifier.
    /// Add any new initializer/reinitializer function to this list.
    function _initializerCalls(Target memory t) internal view returns (bytes[] memory calls) {
        calls = new bytes[](3);
        calls[0] = t.initData; // re-run initialize(...)
        calls[1] = abi.encodeWithSignature("initializeGovernance()");
        calls[2] = abi.encodeWithSignature(
            "initializeOfacProof(address,address,uint256,address)", attacker, attacker, uint256(1), attacker
        );
    }

    function _assertOnlyDeployerHoldsRoles(Target memory t, address proxy) internal view {
        assertTrue(IAccessControl(proxy).hasRole(SECURITY_ROLE, deployer), string.concat(t.name, ": deployer SECURITY"));
        assertTrue(IAccessControl(proxy).hasRole(OPERATIONS_ROLE, deployer), string.concat(t.name, ": deployer OPERATIONS"));
        assertFalse(IAccessControl(proxy).hasRole(SECURITY_ROLE, attacker), string.concat(t.name, ": attacker SECURITY"));
        assertFalse(IAccessControl(proxy).hasRole(OPERATIONS_ROLE, attacker), string.concat(t.name, ": attacker OPERATIONS"));
    }

    function _assertNoInitializerCallable(Target memory t, address proxy) internal {
        bytes[] memory calls = _initializerCalls(t);
        uint64 versionBefore = _initializedVersion(proxy);
        for (uint256 i = 0; i < calls.length; i++) {
            vm.prank(attacker);
            (bool okProxy, ) = proxy.call(calls[i]);
            assertFalse(okProxy, string.concat(t.name, ": initializer callable on proxy"));

            vm.prank(attacker);
            (bool okImpl, ) = t.impl.call(calls[i]);
            assertFalse(okImpl, string.concat(t.name, ": initializer callable on implementation"));
        }
        assertEq(_initializedVersion(proxy), versionBefore, string.concat(t.name, ": initialized version changed"));
        _assertOnlyDeployerHoldsRoles(t, proxy);
    }

    // ------------------------------------------------------------------
    // Tests
    // ------------------------------------------------------------------

    function test_proxyDeployment_requiresInitData() public {
        Target[5] memory ts = _targets();
        for (uint256 i = 0; i < ts.length; i++) {
            vm.expectRevert(ProxyRoot.ProxyRootEmptyInitData.selector);
            new ProxyRoot(ts[i].impl, "");
        }
        // The named proxy wrappers inherit the same check.
        vm.expectRevert(ProxyRoot.ProxyRootEmptyInitData.selector);
        new IdentityVerificationHub(ts[0].impl, "");
        vm.expectRevert(ProxyRoot.ProxyRootEmptyInitData.selector);
        new IdentityRegistry(ts[1].impl, "");
    }

    function test_freshProxy_initializedAtExpectedVersion_andRolesOnlyWithDeployer() public {
        Target[5] memory ts = _targets();
        for (uint256 i = 0; i < ts.length; i++) {
            address proxy = _deploy(ts[i]);
            assertEq(_initializedVersion(proxy), ts[i].expectedVersion, string.concat(ts[i].name, ": version"));
            _assertOnlyDeployerHoldsRoles(ts[i], proxy);
        }
    }

    function test_freshProxy_noInitializerCallableByArbitraryAddress() public {
        Target[5] memory ts = _targets();
        for (uint256 i = 0; i < ts.length; i++) {
            _assertNoInitializerCallable(ts[i], _deploy(ts[i]));
        }
    }

    /// Code-only upgrade (upgradeToAndCall with empty data), as produced by tasks/upgrade for
    /// versions without a new initializer: the new implementation must not expose an initializer.
    function test_codeOnlyUpgrade_noInitializerCallableByArbitraryAddress() public {
        Target[5] memory ts = _targets();
        Target[5] memory next = _targets(); // fresh implementation instances of the same code
        for (uint256 i = 0; i < ts.length; i++) {
            address proxy = _deploy(ts[i]);
            vm.prank(deployer);
            UUPSUpgradeable(proxy).upgradeToAndCall(next[i].impl, "");
            next[i].initData = ts[i].initData;
            _assertNoInitializerCallable(next[i], proxy);
        }
    }

    function test_upgrade_requiresSecurityRole() public {
        Target[5] memory ts = _targets();
        Target[5] memory next = _targets();
        for (uint256 i = 0; i < ts.length; i++) {
            address proxy = _deploy(ts[i]);
            vm.prank(attacker);
            vm.expectRevert(
                abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, SECURITY_ROLE)
            );
            UUPSUpgradeable(proxy).upgradeToAndCall(next[i].impl, "");
        }
    }
}
