const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

import type { 
    PublicSignals,
    Groth16Proof,
    CircuitSignals,
} from "snarkjs";
import { groth16 } from "snarkjs";
import fs from "fs";
import { SMT, ChildNodes } from "@openpassport/zk-kit-smt";
import { poseidon2, poseidon3 } from "poseidon-lite";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import path from "path";
import { RegisterCircuitProof, DscCircuitProof, CircuitArtifacts, VcAndDiscloseProof } from "./types";
import { PassportData } from "../../../common/src/utils/types";

import {BigNumberish} from "ethers";
import { 
    generateCircuitInputsRegister,
    generateCircuitInputsDSC,
    generateCircuitInputsVCandDisclose
} from "../../../common/src/utils/circuits/generateInputs";
import serialized_csca_tree from '../../../common/pubkeys/serialized_csca_tree.json';
import serialized_dsc_tree from '../../../common/pubkeys/serialized_dsc_tree.json';

const registerCircuits: CircuitArtifacts = {
    "register_sha256_sha256_sha256_rsa_65537_4096": {
        wasm: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_js/register_sha256_sha256_sha256_rsa_65537_4096.wasm",
        zkey: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_final.zkey",
        vkey: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_vkey.json"
    }
};
const dscCircuits: CircuitArtifacts = {
    "dsc_sha256_rsa_65537_4096": {
        wasm: "../circuits/build/dsc/dsc_sha256_rsa_65537_4096/dsc_sha256_rsa_65537_4096_js/dsc_sha256_rsa_65537_4096.wasm",
        zkey: "../circuits/build/dsc/dsc_sha256_rsa_65537_4096/dsc_sha256_rsa_65537_4096_final.zkey",
        vkey: "../circuits/build/dsc/dsc_sha256_rsa_65537_4096/dsc_sha256_rsa_65537_4096_vkey.json"
    }
};
const vcAndDiscloseCircuits: CircuitArtifacts = {
    "vc_and_disclose": {
        wasm: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_js/vc_and_disclose.wasm",
        zkey: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_final.zkey",
        vkey: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_vkey.json"
    }
}

export async function generateRegisterProof(
    secret: string,
    passportData: PassportData
): Promise<RegisterCircuitProof> {
    console.log(CYAN, "=== Start generateRegisterProof ===", RESET);

    // Get the circuit inputs
    const registerCircuitInputs: CircuitSignals = await generateCircuitInputsRegister(
        secret,
        passportData,
        serialized_dsc_tree
    );

    // Generate the proof
    const startTime = performance.now();
    
    const registerProof: {
        proof: Groth16Proof,
        publicSignals: PublicSignals
    } = await groth16.fullProve(
        registerCircuitInputs,
        registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].wasm,
        registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].zkey
    );
    
    const endTime = performance.now();
    console.log(GREEN, `groth16.fullProve execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`, RESET);

    // Verify the proof
    const vKey = JSON.parse(fs.readFileSync(registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].vkey, 'utf8'));
    const isValid = await groth16.verify(vKey, registerProof.publicSignals, registerProof.proof);
    if (!isValid) {
        throw new Error("Generated register proof verification failed");
    }
    console.log(GREEN, "Register proof verified successfully", RESET);

    const rawCallData = await groth16.exportSolidityCallData(registerProof.proof, registerProof.publicSignals);
    const fixedProof = parseSolidityCalldata(rawCallData, {} as RegisterCircuitProof);

    console.log(CYAN, "=== End generateRegisterProof ===", RESET);
    return fixedProof;
}

export async function generateDscProof(
    dscCertificate: string,
): Promise<DscCircuitProof> {
    console.log(CYAN, "=== Start generateDscProof ===", RESET);

    const dscCircuitInputs: CircuitSignals = await generateCircuitInputsDSC(
        dscCertificate,
        serialized_csca_tree
    );

    const startTime = performance.now();
    const dscProof = await groth16.fullProve(
        dscCircuitInputs,
        dscCircuits["dsc_sha256_rsa_65537_4096"].wasm,
        dscCircuits["dsc_sha256_rsa_65537_4096"].zkey
    );
    const endTime = performance.now();
    console.log(GREEN, `groth16.fullProve execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`, RESET);

    // Verify the proof
    const vKey = JSON.parse(fs.readFileSync(dscCircuits["dsc_sha256_rsa_65537_4096"].vkey, 'utf8'));
    const isValid = await groth16.verify(vKey, dscProof.publicSignals, dscProof.proof);
    if (!isValid) {
        throw new Error("Generated DSC proof verification failed");
    }
    console.log(GREEN, "DSC proof verified successfully", RESET);

    const rawCallData = await groth16.exportSolidityCallData(dscProof.proof, dscProof.publicSignals);
    const fixedProof = parseSolidityCalldata(rawCallData, {} as DscCircuitProof);

    console.log(CYAN, "=== End generateDscProof ===", RESET);
    return fixedProof;
}

export async function generateVcAndDiscloseRawProof(
    secret: string,
    attestationId: string,
    passportData: PassportData,
    scope: string,
    selectorDg1: string[] = new Array(93).fill("1"),
    selectorOlderThan: string | number = "1",
    merkletree: LeanIMT<bigint>,
    majority: string = "20",
    passportNo_smt?: SMT,
    nameAndDob_smt?: SMT,
    nameAndYob_smt?: SMT,
    selectorOfac: string | number = "1",
    forbiddenCountriesList: string[] = ["AAA"],
    userIdentifier: string = "0000000000000000000000000000000000000000"
): Promise<{
    proof: Groth16Proof,
    publicSignals: PublicSignals
}> {
    // Initialize all three SMTs if not provided
    if (!passportNo_smt || !nameAndDob_smt || !nameAndYob_smt) {
        const smts = getSMTs();
        passportNo_smt = smts.passportNo_smt;
        nameAndDob_smt = smts.nameAndDob_smt;
        nameAndYob_smt = smts.nameAndYob_smt;
    }
        
    const vcAndDiscloseCircuitInputs: CircuitSignals = generateCircuitInputsVCandDisclose(
        secret,
        attestationId,
        passportData,
        scope,
        selectorDg1,
        selectorOlderThan,
        merkletree,
        majority,
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        selectorOfac,
        forbiddenCountriesList,
        userIdentifier
    );

    console.log(CYAN, "=== Start generateVcAndDiscloseRawProof ===", RESET);
    const startTime = performance.now();
    const vcAndDiscloseProof = await groth16.fullProve(
        vcAndDiscloseCircuitInputs,
        vcAndDiscloseCircuits["vc_and_disclose"].wasm,
        vcAndDiscloseCircuits["vc_and_disclose"].zkey
    );

    const endTime = performance.now();
    console.log(GREEN, `groth16.fullProve execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`, RESET);

    // Verify the proof
    const vKey = JSON.parse(fs.readFileSync(vcAndDiscloseCircuits["vc_and_disclose"].vkey, 'utf8'));
    const isValid = await groth16.verify(vKey, vcAndDiscloseProof.publicSignals, vcAndDiscloseProof.proof);
    if (!isValid) {
        throw new Error("Generated VC and Disclose proof verification failed");
    }
    console.log(GREEN, "VC and Disclose proof verified successfully", RESET);
    console.log(CYAN, "=== End generateVcAndDiscloseRawProof ===", RESET);

    return vcAndDiscloseProof;
}

export async function generateVcAndDiscloseProof(
    secret: string,
    attestationId: string,
    passportData: PassportData,
    scope: string,
    selectorDg1: string[] = new Array(93).fill("1"),
    selectorOlderThan: string | number = "1",
    merkletree: LeanIMT<bigint>,
    majority: string = "20",
    passportNo_smt?: SMT,
    nameAndDob_smt?: SMT,
    nameAndYob_smt?: SMT,
    selectorOfac: string | number = "1",
    forbiddenCountriesList: string[] = ["AAA","000","000","000","000","000","000","000","000","000","AAA","000","000","000","000","000","000","000","000","000","AAA","000","000","000","000","000","000","000","000","000","AAA","000","000","000","000","000","000","000","000","000"],
    userIdentifier: string = "0000000000000000000000000000000000000000"
): Promise<VcAndDiscloseProof> {
    const rawProof = await generateVcAndDiscloseRawProof(
        secret,
        attestationId,
        passportData,
        scope,
        selectorDg1,
        selectorOlderThan,
        merkletree,
        majority,
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        selectorOfac,
        forbiddenCountriesList,
        userIdentifier
    );

    const rawCallData = await groth16.exportSolidityCallData(rawProof.proof, rawProof.publicSignals);
    const fixedProof = parseSolidityCalldata(rawCallData, {} as VcAndDiscloseProof);

    return fixedProof;
}

export function parseSolidityCalldata<T>(rawCallData: string, _type: T): T {
    const parsed = JSON.parse("[" + rawCallData + "]");
    
    return {
        a: parsed[0].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
        b: parsed[1].map((arr: string[]) => 
            arr.map((x: string) => x.replace(/"/g, ''))
        ) as [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]],
        c: parsed[2].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
        pubSignals: parsed[3].map((x: string) => x.replace(/"/g, '')) as BigNumberish[]
    } as T;
}


export function getSMTs() {    
    const passportNo_smt = importSMTFromJsonFile("../common/ofacdata/outputs/passportNoAndNationalitySMT.json") as SMT;
    const nameAndDob_smt = importSMTFromJsonFile("../common/ofacdata/outputs/nameAndDobSMT.json") as SMT;
    const nameAndYob_smt = importSMTFromJsonFile("../common/ofacdata/outputs/nameAndYobSMT.json") as SMT;

    return {
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt
    };
}

function importSMTFromJsonFile(filePath?: string): SMT | null {
    try {
        const jsonString = fs.readFileSync(path.resolve(process.cwd(), filePath as string), 'utf8');
          
        const data = JSON.parse(jsonString);
          
        const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes));
        const smt = new SMT(hash2, true);
        smt.import(data);
          
        return smt;
    } catch (error) {
        console.error('Failed to import SMT from JSON file:', error);
        return null;
    }
}