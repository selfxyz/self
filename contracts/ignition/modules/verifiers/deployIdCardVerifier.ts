import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * This module deploys the ID Card Verifier contract specifically for register_id
 * with SHA256+SHA256+SHA256+RSA verifier
 */
export default buildModule("DeployIdCardVerifier", (m) => {
  // Deploy the ID Card Verifier contract
  const idCardVerifier = m.contract("Verifier_register_id_sha256_sha256_sha256_rsa_65537_4096");

  return {
    idCardVerifier,
  };
});
