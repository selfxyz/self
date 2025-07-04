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
 * npx hardhat verify <DEPLOYED_ADDRESS> 0x3e2487a250e2A7b56c7ef5307Fb591Cc8C83623D 12345 --network alfajores
 *
 * PARAMETERS:
 * - identityVerificationHubV2Address: Hub V2 contract address (default: 0x3e2487a250e2A7b56c7ef5307Fb591Cc8C83623D)
 * - scopeValue: Proof scope value (default: 12345 - TEMPORARY VALUE, you have to calculate it yourself after getting the address and called setScopeValue)
 */

export default buildModule("DeployTestSelfVerificationRoot", (m) => {
  const identityVerificationHubV2Address = m.getParameter(
    "identityVerificationHubV2Address",
    "0x68c931C9a534D37aa78094877F46fE46a49F1A51",
  );
  const scopeValue = m.getParameter("scopeValue", 12345);
  console.log("identityVerificationHubV2Address", identityVerificationHubV2Address);
  console.log("scopeValue", scopeValue);
  const testSelfVerificationRoot = m.contract("TestSelfVerificationRoot", [
    identityVerificationHubV2Address,
    scopeValue,
  ]);

  return {
    testSelfVerificationRoot,
  };
});
