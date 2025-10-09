import { buildModule, IgnitionModuleBuilder } from "@nomicfoundation/ignition-core";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

const registries = {
  // "DeployRegistryModule#IdentityRegistry": {
  //   shouldChange: true,
  //   passportNoOfac: "17359956125106148146828355805271472653597249114301196742546733402427978706344",
  //   nameAndDobOfac: "7420120618403967585712321281997181302561301414016003514649937965499789236588",
  //   nameAndYobOfac: "16836358042995742879630198413873414945978677264752036026400967422611478610995",
  //   hub: "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  //   cscaRoot: "13859398115974385161464830211947258005860166431741677064758266112192747818198",
  // },
  // "DeployIdCardRegistryModule#IdentityRegistry": {
  //   shouldChange: true,
  //   nameAndDobOfac: "20550865940766091336114076617084411967227963708544788410483208672684333597871",
  //   nameAndYobOfac: "20607501071671444315195585339157145490348308593668944037177822930025980459166",
  //   hub: "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  //   cscaRoot: "13859398115974385161464830211947258005860166431741677064758266112192747818198",
  // },
  "DeployAadhaarRegistryModule#IdentityRegistry": {
    shouldChange: true,
    nameAndDobOfac: "4183822562579010781434914867177251983368244626022840551534475857364967864437",
    nameAndYobOfac: "14316795765689804800341464910235935757494922653038299433675973925727164473934",
    hub: "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF",
    pubkeyCommitments: [
      "5648956411273136337349787488442520720416229937879112788241850936049694492145",
      "18304035373718681408213540837772113004961405604264885188535510276454415833542",
      "3099763118716361008062312602688327679110629275746483297740895929951765195538",
      "5960616419594750988984019912914733527854225713611991429799390436159340745422",
      "1312086597361744268424404341813751658452218312204370523713186983060138886330",
    ],
  },
};

// Helper function to get implementation contract name from deployment module
function getImplementationName(registryModule: string): string {
  const implMap: Record<string, string> = {
    "DeployRegistryModule#IdentityRegistry": "IdentityRegistryImplV1",
    "DeployIdCardRegistryModule#IdentityRegistry": "IdentityRegistryIdCardImplV1",
    "DeployAadhaarRegistryModule#IdentityRegistry": "IdentityRegistryAadhaarImplV1",
  };

  return implMap[registryModule] || "IdentityRegistryImplV1";
}

//generator function that yields a new id each time it is called
const ids = (() => {
  let id = 2;
  return () => {
    id++;
    return "a" + id.toString();
  };
})();

export function handleRegistryDeployment(
  m: IgnitionModuleBuilder,
  registryModule: string,
  registryData: any,
  deployedAddresses: any,
  lastOperation?: any,
) {
  const registryAddress = deployedAddresses[registryModule];
  const implName = getImplementationName(registryModule);
  console.log(`Using implementation ${implName} for proxy at ${registryAddress}`);

  const deployOptions = lastOperation ? { after: [lastOperation] } : {};
  const registryContract = m.contractAt(implName, registryAddress, { id: ids(), ...deployOptions });

  let currentOperation: any = registryContract;

  if (registryData.shouldChange) {
    // Update hub for all registries
    if (registryData.hub) {
      const callOptions = { after: [currentOperation], id: ids() };
      currentOperation = m.call(registryContract, "updateHub", [registryData.hub], callOptions);
    }

    if (registryData.cscaRoot) {
      const callOptions = { after: [currentOperation], id: ids() };
      currentOperation = m.call(registryContract, "updateCscaRoot", [registryData.cscaRoot], callOptions);
    }

    if (registryData.passportNoOfac) {
      const callOptions = { after: [currentOperation], id: ids() };
      currentOperation = m.call(
        registryContract,
        "updatePassportNoOfacRoot",
        [registryData.passportNoOfac],
        callOptions,
      );
    }
    if (registryData.nameAndDobOfac) {
      const callOptions = { after: [currentOperation], id: ids() };
      currentOperation = m.call(
        registryContract,
        "updateNameAndDobOfacRoot",
        [registryData.nameAndDobOfac],
        callOptions,
      );
    }
    if (registryData.nameAndYobOfac) {
      const callOptions = { after: [currentOperation], id: ids() };
      currentOperation = m.call(
        registryContract,
        "updateNameAndYobOfacRoot",
        [registryData.nameAndYobOfac],
        callOptions,
      );
    }

    if (registryData.pubkeyCommitments && registryData.pubkeyCommitments.length > 0) {
      for (const pubkeyCommitment of registryData.pubkeyCommitments) {
        const callOptions = { after: [currentOperation], id: ids() };
        currentOperation = m.call(registryContract, "registerUidaiPubkeyCommitment", [pubkeyCommitment], callOptions);
      }
    }
  }

  return { registryContract, lastOperation: currentOperation };
}

export default buildModule("UpdateAllRegistries", (m) => {
  const deployments: Record<string, any> = {};
  let lastOperation: any = null;

  const chainId = hre.network.config.chainId;
  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${chainId}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  for (const registry of Object.keys(registries)) {
    const registryData = registries[registry as keyof typeof registries];
    const result = handleRegistryDeployment(m, registry, registryData, deployedAddresses, lastOperation);
    deployments[registry] = result.registryContract;
    lastOperation = result.lastOperation;
  }

  console.log(`Registry operations will execute sequentially to prevent nonce conflicts`);
  return deployments;
});
