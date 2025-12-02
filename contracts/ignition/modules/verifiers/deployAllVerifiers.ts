import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// All circuit names as a union type
export type CircuitName =
  | "register_sha256_sha256_sha256_rsa_65537_4096"
  | "register_sha256_sha256_sha256_ecdsa_brainpoolP384r1"
  | "register_sha256_sha256_sha256_ecdsa_secp256r1"
  | "register_sha256_sha256_sha256_ecdsa_secp384r1"
  | "register_sha256_sha256_sha256_rsa_3_4096"
  | "register_sha256_sha256_sha256_rsapss_3_32_2048"
  | "register_sha256_sha256_sha256_rsapss_65537_32_2048"
  | "register_sha256_sha256_sha256_rsapss_65537_32_3072"
  | "register_sha384_sha384_sha384_ecdsa_brainpoolP384r1"
  | "register_sha384_sha384_sha384_ecdsa_brainpoolP512r1"
  | "register_sha384_sha384_sha384_ecdsa_secp384r1"
  | "register_sha512_sha512_sha512_ecdsa_brainpoolP512r1"
  | "register_sha512_sha512_sha512_rsa_65537_4096"
  | "register_sha512_sha512_sha512_rsapss_65537_64_2048"
  | "register_sha1_sha1_sha1_rsa_65537_4096"
  | "register_sha1_sha256_sha256_rsa_65537_4096"
  | "register_sha224_sha224_sha224_ecdsa_brainpoolP224r1"
  | "register_sha256_sha224_sha224_ecdsa_secp224r1"
  | "register_sha256_sha256_sha256_ecdsa_brainpoolP256r1"
  | "register_sha1_sha1_sha1_ecdsa_brainpoolP224r1"
  | "register_sha384_sha384_sha384_rsapss_65537_48_2048"
  | "register_sha1_sha1_sha1_ecdsa_secp256r1"
  | "register_sha256_sha256_sha256_rsapss_65537_64_2048"
  | "register_sha512_sha512_sha256_rsa_65537_4096"
  | "register_sha512_sha512_sha512_ecdsa_secp521r1"
  | "register_id_sha256_sha256_sha256_rsa_65537_4096"
  | "register_sha256_sha256_sha224_ecdsa_secp224r1"
  | "register_id_sha1_sha1_sha1_ecdsa_brainpoolP224r1"
  | "register_id_sha1_sha1_sha1_ecdsa_secp256r1"
  | "register_id_sha1_sha1_sha1_rsa_65537_4096"
  | "register_id_sha1_sha256_sha256_rsa_65537_4096"
  | "register_id_sha224_sha224_sha224_ecdsa_brainpoolP224r1"
  | "register_id_sha256_sha224_sha224_ecdsa_secp224r1"
  | "register_id_sha256_sha256_sha224_ecdsa_secp224r1"
  | "register_id_sha256_sha256_sha256_ecdsa_brainpoolP256r1"
  | "register_id_sha256_sha256_sha256_ecdsa_brainpoolP384r1"
  | "register_id_sha256_sha256_sha256_ecdsa_secp256r1"
  | "register_id_sha256_sha256_sha256_ecdsa_secp384r1"
  | "register_id_sha256_sha256_sha256_rsa_3_4096"
  | "register_id_sha256_sha256_sha256_rsapss_3_32_2048"
  | "register_id_sha256_sha256_sha256_rsapss_65537_32_2048"
  | "register_id_sha256_sha256_sha256_rsapss_65537_32_3072"
  | "register_id_sha256_sha256_sha256_rsapss_65537_64_2048"
  | "register_id_sha384_sha384_sha384_ecdsa_brainpoolP384r1"
  | "register_id_sha384_sha384_sha384_ecdsa_brainpoolP512r1"
  | "register_id_sha384_sha384_sha384_ecdsa_secp384r1"
  | "register_id_sha384_sha384_sha384_rsapss_65537_48_2048"
  | "register_id_sha512_sha512_sha256_rsa_65537_4096"
  | "register_id_sha512_sha512_sha512_ecdsa_brainpoolP512r1"
  | "register_id_sha512_sha512_sha512_ecdsa_secp521r1"
  | "register_id_sha512_sha512_sha512_rsa_65537_4096"
  | "register_id_sha512_sha512_sha512_rsapss_65537_64_2048"
  | "register_aadhaar"
  | "register_sha1_sha1_sha1_rsa_64321_4096"
  | "register_sha256_sha1_sha1_rsa_65537_4096"
  | "register_sha256_sha256_sha256_rsapss_65537_32_4096"
  | "register_id_sha512_sha512_sha256_rsapss_65537_32_2048"
  | "register_sha512_sha512_sha256_rsapss_65537_32_2048"
  | "dsc_sha1_ecdsa_brainpoolP256r1"
  | "dsc_sha1_rsa_65537_4096"
  | "dsc_sha256_ecdsa_brainpoolP256r1"
  | "dsc_sha256_ecdsa_brainpoolP384r1"
  | "dsc_sha256_ecdsa_secp256r1"
  | "dsc_sha256_ecdsa_secp384r1"
  | "dsc_sha256_ecdsa_secp521r1"
  | "dsc_sha256_rsa_65537_4096"
  | "dsc_sha256_rsapss_3_32_3072"
  | "dsc_sha256_rsapss_65537_32_3072"
  | "dsc_sha256_rsapss_65537_32_4096"
  | "dsc_sha384_ecdsa_brainpoolP384r1"
  | "dsc_sha384_ecdsa_brainpoolP512r1"
  | "dsc_sha384_ecdsa_secp384r1"
  | "dsc_sha512_ecdsa_brainpoolP512r1"
  | "dsc_sha512_ecdsa_secp521r1"
  | "dsc_sha512_rsa_65537_4096"
  | "dsc_sha512_rsapss_65537_64_4096"
  // | "dsc_sha256_rsapss_3_32_4096"
  | "dsc_sha1_ecdsa_secp256r1"
  | "dsc_sha256_rsa_107903_4096"
  | "dsc_sha256_rsa_122125_4096"
  | "dsc_sha256_rsa_130689_4096"
  | "dsc_sha256_rsa_56611_4096"
  | "vc_and_disclose"
  | "vc_and_disclose_id"
  | "vc_and_disclose_aadhaar";

// Record mapping circuit names to numbers
export const circuitIds: Record<CircuitName, [boolean, number]> = {
  register_sha256_sha256_sha256_rsa_65537_4096: [true, 0],
  register_sha256_sha256_sha256_ecdsa_brainpoolP384r1: [true, 1],
  register_sha256_sha256_sha256_ecdsa_secp256r1: [true, 2],
  register_sha256_sha256_sha256_ecdsa_secp384r1: [true, 3],
  register_sha256_sha256_sha256_rsa_3_4096: [true, 4],
  register_sha256_sha256_sha256_rsapss_3_32_2048: [true, 5],
  register_sha256_sha256_sha256_rsapss_65537_32_2048: [true, 6],
  register_sha256_sha256_sha256_rsapss_65537_32_3072: [true, 7],
  register_sha384_sha384_sha384_ecdsa_brainpoolP384r1: [true, 8],
  register_sha384_sha384_sha384_ecdsa_brainpoolP512r1: [true, 9],
  register_sha384_sha384_sha384_ecdsa_secp384r1: [true, 10],
  register_sha512_sha512_sha512_ecdsa_brainpoolP512r1: [true, 11],
  register_sha512_sha512_sha512_rsa_65537_4096: [true, 12],
  register_sha512_sha512_sha512_rsapss_65537_64_2048: [true, 13],
  register_sha1_sha1_sha1_rsa_65537_4096: [true, 14],
  register_sha1_sha256_sha256_rsa_65537_4096: [true, 15],
  register_sha224_sha224_sha224_ecdsa_brainpoolP224r1: [true, 16],
  register_sha256_sha224_sha224_ecdsa_secp224r1: [true, 17],
  register_sha256_sha256_sha256_ecdsa_brainpoolP256r1: [true, 18],
  register_sha1_sha1_sha1_ecdsa_brainpoolP224r1: [true, 19],
  register_sha384_sha384_sha384_rsapss_65537_48_2048: [true, 20],
  register_sha1_sha1_sha1_ecdsa_secp256r1: [true, 21],
  register_sha256_sha256_sha256_rsapss_65537_64_2048: [true, 22],
  register_sha512_sha512_sha256_rsa_65537_4096: [true, 23],
  register_sha512_sha512_sha512_ecdsa_secp521r1: [true, 24],
  register_id_sha256_sha256_sha256_rsa_65537_4096: [true, 25],
  register_sha256_sha256_sha224_ecdsa_secp224r1: [true, 26],
  register_id_sha1_sha1_sha1_ecdsa_brainpoolP224r1: [true, 27],
  register_id_sha1_sha1_sha1_ecdsa_secp256r1: [true, 28],
  register_id_sha1_sha1_sha1_rsa_65537_4096: [true, 29],
  register_id_sha1_sha256_sha256_rsa_65537_4096: [true, 30],
  register_id_sha224_sha224_sha224_ecdsa_brainpoolP224r1: [true, 31],
  register_id_sha256_sha224_sha224_ecdsa_secp224r1: [true, 32],
  register_id_sha256_sha256_sha224_ecdsa_secp224r1: [true, 33],
  register_id_sha256_sha256_sha256_ecdsa_brainpoolP256r1: [true, 34],
  register_id_sha256_sha256_sha256_ecdsa_brainpoolP384r1: [true, 35],
  register_id_sha256_sha256_sha256_ecdsa_secp256r1: [true, 36],
  register_id_sha256_sha256_sha256_ecdsa_secp384r1: [true, 37],
  register_id_sha256_sha256_sha256_rsa_3_4096: [true, 38],
  register_id_sha256_sha256_sha256_rsapss_3_32_2048: [true, 39],
  register_id_sha256_sha256_sha256_rsapss_65537_32_2048: [true, 40],
  register_id_sha256_sha256_sha256_rsapss_65537_32_3072: [true, 41],
  register_id_sha256_sha256_sha256_rsapss_65537_64_2048: [true, 42],
  register_id_sha384_sha384_sha384_ecdsa_brainpoolP384r1: [true, 43],
  register_id_sha384_sha384_sha384_ecdsa_brainpoolP512r1: [true, 44],
  register_id_sha384_sha384_sha384_ecdsa_secp384r1: [true, 45],
  register_id_sha384_sha384_sha384_rsapss_65537_48_2048: [true, 46],
  register_id_sha512_sha512_sha256_rsa_65537_4096: [true, 47],
  register_id_sha512_sha512_sha512_ecdsa_brainpoolP512r1: [true, 48],
  register_id_sha512_sha512_sha512_ecdsa_secp521r1: [true, 49],
  register_id_sha512_sha512_sha512_rsa_65537_4096: [true, 50],
  register_id_sha512_sha512_sha512_rsapss_65537_64_2048: [true, 51],
  register_aadhaar: [true, 52],
  register_sha1_sha1_sha1_rsa_64321_4096: [true, 53],
  register_sha256_sha1_sha1_rsa_65537_4096: [true, 54],
  register_sha256_sha256_sha256_rsapss_65537_32_4096: [true, 55],
  register_id_sha512_sha512_sha256_rsapss_65537_32_2048: [true, 56],
  register_sha512_sha512_sha256_rsapss_65537_32_2048: [true, 57],

  dsc_sha1_ecdsa_brainpoolP256r1: [true, 0],
  dsc_sha1_rsa_65537_4096: [true, 1],
  dsc_sha256_ecdsa_brainpoolP256r1: [true, 2],
  dsc_sha256_ecdsa_brainpoolP384r1: [true, 3],
  dsc_sha256_ecdsa_secp256r1: [true, 4],
  dsc_sha256_ecdsa_secp384r1: [true, 5],
  dsc_sha256_ecdsa_secp521r1: [true, 6],
  dsc_sha256_rsa_65537_4096: [true, 7],
  dsc_sha256_rsapss_3_32_3072: [true, 8],
  dsc_sha256_rsapss_65537_32_3072: [true, 9],
  dsc_sha256_rsapss_65537_32_4096: [true, 10],
  dsc_sha384_ecdsa_brainpoolP384r1: [true, 11],
  dsc_sha384_ecdsa_brainpoolP512r1: [true, 12],
  dsc_sha384_ecdsa_secp384r1: [true, 13],
  dsc_sha512_ecdsa_brainpoolP512r1: [true, 14],
  dsc_sha512_ecdsa_secp521r1: [true, 15],
  dsc_sha512_rsa_65537_4096: [true, 16],
  dsc_sha512_rsapss_65537_64_4096: [true, 17],
  // dsc_sha256_rsapss_3_32_4096: [true, 18],
  dsc_sha1_ecdsa_secp256r1: [true, 19],
  dsc_sha256_rsa_107903_4096: [true, 20],
  dsc_sha256_rsa_122125_4096: [true, 21],
  dsc_sha256_rsa_130689_4096: [true, 22],
  dsc_sha256_rsa_56611_4096: [true, 23],

  vc_and_disclose: [true, 24],
  vc_and_disclose_id: [true, 25],
  vc_and_disclose_aadhaar: [true, 26],
};

export default buildModule("DeployAllVerifiers", (m) => {
  const deployments: Record<string, any> = {};
  let lastDeployedContract: any = null;

  for (const circuit of Object.keys(circuitIds) as CircuitName[]) {
    const [shouldDeploy] = circuitIds[circuit];

    if (!shouldDeploy) {
      console.log(`Skipping Verifier_${circuit}`);
      continue;
    }

    const name = `Verifier_${circuit}`;
    console.log(`Deploying ${name}...`);

    // Create dependency on the last deployed contract to ensure sequential deployment
    const deployOptions = lastDeployedContract ? { after: [lastDeployedContract] } : {};
    deployments[name] = m.contract(name, [], deployOptions);
    lastDeployedContract = deployments[name];
  }

  console.log(`Deployments will execute sequentially to prevent nonce conflicts`);
  return deployments;
});
