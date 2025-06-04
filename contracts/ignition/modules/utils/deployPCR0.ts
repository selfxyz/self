import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeployPCR0", (m) => {
  const pcr0Manager = m.contract("PCR0Manager");

  return {
    pcr0Manager,
  };
});
