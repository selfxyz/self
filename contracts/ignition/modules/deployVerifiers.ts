import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeployVerifiers", (m) => {
  // const vcAndDiscloseVerifier = m.contract("Verifier_vc_and_disclose");

  // const registerVerifier = m.contract("Verifier_register_sha1_sha256_sha256_rsa_65537_4096");
  // const registerVerifier2 = m.contract("Verifier_register_sha256_sha256_sha256_ecdsa_brainpoolP256r1");
  // const registerVerifier3 = m.contract("Verifier_register_sha256_sha256_sha256_rsa_65537_4096");
  const verifier1 = m.contract("Verifier_dsc_sha1_ecdsa_secp256r1");
  const verifier2 = m.contract("Verifier_dsc_sha256_ecdsa_secp521r1");
  const verifier3 = m.contract("Verifier_dsc_sha384_ecdsa_brainpoolP512r1");
  const verifier4 = m.contract("Verifier_dsc_sha512_ecdsa_brainpoolP512r1");
  const verifier5 = m.contract("Verifier_dsc_sha512_ecdsa_secp521r1");
  const verifier6 = m.contract("Verifier_register_sha1_sha1_sha1_ecdsa_secp256r1");
  const verifier7 = m.contract("Verifier_register_sha256_sha256_sha256_rsapss_65537_64_2048");
  const verifier8 = m.contract("Verifier_register_sha512_sha512_sha256_rsa_65537_4096");
  const verifier9 = m.contract("Verifier_register_sha512_sha512_sha512_ecdsa_secp521r1");
  const verifier10 = m.contract("Verifier_register_sha512_sha512_sha512_ecdsa_brainpoolP512r1");
  const verifier11 = m.contract("Verifier_register_sha384_sha384_sha384_ecdsa_brainpoolP512r1");

  // const dscVerifier = m.contract("Verifier_dsc_sha256_rsa_65537_4096");

  return {
    verifier1,
    verifier2,
    verifier3,
    verifier4,
    verifier5,
    verifier6,
    verifier7,
    verifier8,
    verifier9,
    verifier10,
    verifier11,
  };
});
