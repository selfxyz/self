import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getCscaTreeRoot } from "../../../common/src/utils/trees";
import path from "path";
import fs from "fs";
import { SMT, ChildNodes } from "@openpassport/zk-kit-smt";
import { poseidon2, poseidon3 } from "poseidon-lite";
import { buildSMT } from "../../../common/src/utils/trees";
import { artifacts } from "hardhat";
import { ethers } from "ethers";

export default buildModule("DeployRegistryModule", (m) => {
    // Deploy PoseidonT3
    const poseidonT3 = m.library("PoseidonT3");
    
    // Deploy IdentityRegistryImplV1
    const identityRegistryImpl = m.contract("IdentityRegistryImplV1", [], {
        libraries: { PoseidonT3: poseidonT3 },
    });

    // Deploy registry with temporary hub address
    const registryInterface = getRegistryInitializeData();
    const registryInitData = registryInterface.encodeFunctionData("initialize", [
        "0x0000000000000000000000000000000000000000"
    ]);
    const registry = m.contract("IdentityRegistry", [
        identityRegistryImpl,
        registryInitData
    ]);

    // Return deployed contracts
    return {
        poseidonT3,
        identityRegistryImpl,
        registry
    };
});

export function getSMT() {
    let name = fs.readFileSync("../common/ofacdata/inputs/names.json", "utf-8");
    let name_list = JSON.parse(name);
    let mockSmt;
    if (fs.existsSync("./test/utils/smt.json")) {
        mockSmt = importSMTFromJsonFile("./test/utils/smt.json") as SMT;
    } else {
        const builtSmt = buildSMT(name_list, "name");
        exportSMTToJsonFile(builtSmt[0], builtSmt[1], builtSmt[2], "./test/utils/smt.json");
        mockSmt = builtSmt[2] as SMT;
    }
    return mockSmt;
}

function exportSMTToJsonFile(count: number, time: number, smt: SMT, outputPath?: string) {
    const serializedSMT = smt.export();
    const data = {
        count: count,
        time: time,
        smt: serializedSMT
    };
    const jsonString = JSON.stringify(data, null, 2);
    const defaultPath = path.join(process.cwd(), 'smt.json');
    const finalPath = outputPath ? path.resolve(process.cwd(), outputPath) : defaultPath;
  
    fs.writeFileSync(finalPath, jsonString, 'utf8');
}

function importSMTFromJsonFile(filePath?: string): SMT | null {
    try {
        const jsonString = fs.readFileSync(path.resolve(process.cwd(), filePath as string), 'utf8');
          
        const data = JSON.parse(jsonString);
          
        const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes));
        const smt = new SMT(hash2, true);
        smt.import(data.smt);
          
        return smt;
    } catch (error) {
        console.error('Failed to import SMT from JSON file:', error);
        return null;
    }
}

function getRegistryInitializeData() {
    const registryArtifact = artifacts.readArtifactSync("IdentityRegistryImplV1");
    const registryInterface = new ethers.Interface(registryArtifact.abi);
    return registryInterface;
}