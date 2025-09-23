import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * TestSelfVerificationRoot Deployment Module
 *
 * Deploys the TestSelfVerificationRoot contract for testing self-verification functionality.
 *
 * USAGE:
 * npx hardhat ignition deploy ignition/modules/deployTestSelfVerificationRoot.ts --network alfajores --verify
 *
 * VERIFICATION:
 * npx hardhat verify <DEPLOYED_ADDRESS> 0x68c931C9a534D37aa78094877F46fE46a49F1A51 "test-scope" --network alfajores
 *
 * PARAMETERS:
 * - identityVerificationHubV2Address: Hub V2 contract address (default: 0x68c931C9a534D37aa78094877F46fE46a49F1A51)
 * - scopeSeed: Scope seed string for automatic scope generation (default: "test-scope")
 */

export default buildModule("DeployTestSelfVerificationRoot", (m) => {
  const identityVerificationHubV2Address = m.getParameter(
    "identityVerificationHubV2Address",
    "0x68c931C9a534D37aa78094877F46fE46a49F1A51",
  );
  const scopeSeed = m.getParameter("scopeSeed", "test-scope");
  console.log("identityVerificationHubV2Address", identityVerificationHubV2Address);
  console.log("scopeSeed", scopeSeed);

  // Deploy TestSelfVerificationRoot
  const testSelfVerificationRoot = m.contract("TestSelfVerificationRoot", [
    identityVerificationHubV2Address,
    scopeSeed,
  ]);

  return {
    testSelfVerificationRoot,
  };
});
