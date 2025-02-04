import { ethers } from "hardhat";
import { expect } from "chai";
import { groth16 } from "snarkjs";
import fs from 'fs';
import {
    VERIFICATION_TYPE_ENUM_PROVE,
    VERIFICATION_TYPE_ENUM_DSC,
    PROVE_RSA_COMMITMENT_INDEX,
    PROVE_RSA_NULLIFIER_INDEX,
    PROVE_RSA_BLINDED_DSC_COMMITMENT_INDEX,
    PROVE_RSA_CURRENT_DATE_INDEX,
    DSC_MERKLE_ROOT_INDEX
} from "../../../common/src/constants/contractConstants";
import { PassportData } from "../../../common/src/utils/types";
import { genMockPassportData } from "../../../common/src/utils/genMockPassportData";
import { 
    generateCircuitInputsDSC,
    sendCSCARequest,
    getCSCAModulusMerkleTree
 } from "../../../common/src/utils/csca";
import { formatRoot } from "../../../common/src/utils/utils";
import { mock_dsc_sha256_rsa_4096 } from "../../../common/src/constants/mockCertificates";
import { generateCircuitInputsProve } from "../../../common/src/utils/generateInputs";
import { buildSMT } from "../../../common/src/utils/smtTree";
import { SMT, ChildNodes } from "@ashpect/smt";
import path from "path";
import { poseidon3, poseidon2 } from "poseidon-lite"

type CircuitArtifacts = {
    [key: string]: {
        wasm: string,
        zkey: string,
        vkey: string,
        verifier?: any,
        inputs?: any,
        parsedCallData?: any,
        formattedCallData?: any,
    }
}

// Just test for mint function
describe("Test register flow", async function () {
    this.timeout(0);

    const PROVE_RSA_65537_SHA256_VERIFIER_ID = 0;
    const DSC_RSA65537_SHA256_4096_VERIFIER_ID = 1;

    // contracts
    let genericVerifier: any;
    let openPassportVerifier: any;

    let openPassportRegistry: any;
    let openPassportRegister: any;

    let verifierProveRsa65537Sha256: any;
    let verifierDscRsa65537Sha256_4096: any;

    let poseidonT3: any;

    // EVM state id
    let snapshotId: any;

    // users
    let owner: any;
    let addr1: any;
    let addr2: any;

    let prove_proof: any;
    let dsc_proof: any;

    // mock passport
    let mockPassport: PassportData = genMockPassportData(
        "rsa_sha256_65537_2048",
        "FRA",
        "940131",
        "401031"
    );

    // TODO: use path to get more robustness
    // TODO: make it change to global valuable for local and prod path 
    let prove_circuits: CircuitArtifacts = {};

    prove_circuits["prove_rsa_65537_sha256"] = {
        wasm: "../circuits/build/fromAWS/prove_rsa_65537_sha256.wasm",
        zkey: "../circuits/build/fromAWS/prove_rsa_65537_sha256.zkey",
        vkey: "../circuits/build/fromAWS/prove_rsa_65537_sha256_vkey.json"
    }

    before(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Set up contracts
        let verifierProveRsa65537Sha256Factory: any;

        // Right now, only works for prod env
        verifierProveRsa65537Sha256Factory = await ethers.getContractFactory("contracts/mock/mockVerifierProveRsa65537Sha256_2048.sol:Mock_Verifier_prove_rsa_65537_sha256", owner);

        verifierProveRsa65537Sha256 = await verifierProveRsa65537Sha256Factory.deploy();
        await verifierProveRsa65537Sha256.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_prove_rsa_65537_sha256 deployed to ${verifierProveRsa65537Sha256.target}`);

        let verifierDscRsa65537Sha256_4096Factory: any;
        verifierDscRsa65537Sha256_4096Factory = await ethers.getContractFactory("contracts/mock/mockVerifierDscRsa65537Sha256_4096.sol:Mock_Verifier_dsc_rsa_65537_sha256_4096", owner);

        verifierDscRsa65537Sha256_4096 = await verifierDscRsa65537Sha256_4096Factory.deploy();
        await verifierDscRsa65537Sha256_4096.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `Verifier_dsc_rsa_65537_sha256_4096 deployed to ${verifierDscRsa65537Sha256_4096.target}`);

        const genericVerifierFactory = await ethers.getContractFactory("GenericVerifier", owner);
        genericVerifier = await genericVerifierFactory.deploy();
        await genericVerifier.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `VerfiersManager deployed to ${genericVerifier.target}`);

        const openPassportVerifierFactory = await ethers.getContractFactory("OpenPassportVerifier", owner);
        openPassportVerifier = await openPassportVerifierFactory.deploy(
            genericVerifier
        );
        await openPassportVerifier.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `sbt deployed to ${openPassportVerifier.target}`);

        const merkleTree = getCSCAModulusMerkleTree();
        const openPassportRegistryFacotry = await ethers.getContractFactory("OpenPassportRegistry", owner);
        openPassportRegistry = await openPassportRegistryFacotry.deploy(
            formatRoot(merkleTree.root)
        );
        console.log("root: ", formatRoot(merkleTree.root));

        const PoseidonT3 = await ethers.getContractFactory("PoseidonT3");
        poseidonT3 = await PoseidonT3.deploy();
        await poseidonT3.waitForDeployment();
        console.log('\x1b[34m%s\x1b[0m', `PoseidonT3 deployed to: ${poseidonT3.target}`);

        const openPassportRegisterFactory = await ethers.getContractFactory("OpenPassportRegister", {
            libraries: {
              PoseidonT3: poseidonT3
            }
        });
        openPassportRegister = await openPassportRegisterFactory.deploy(
            openPassportRegistry,
            openPassportVerifier
        );

        await genericVerifier.updateVerifier(
            VERIFICATION_TYPE_ENUM_PROVE,
            PROVE_RSA_65537_SHA256_VERIFIER_ID,
            verifierProveRsa65537Sha256.target
        );

        await genericVerifier.updateVerifier(
            VERIFICATION_TYPE_ENUM_DSC,
            DSC_RSA65537_SHA256_4096_VERIFIER_ID,
            verifierDscRsa65537Sha256_4096.target
        );

        snapshotId = await ethers.provider.send("evm_snapshot", []);

        prove_proof = await generateProofRSAProve();

        dsc_proof = await generateMockProofDSC();
    });

    afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    describe("test verify function", async function() {
        it("Should verify valid passport data", async function() {
            const attestation = {
                proveVerifierId: PROVE_RSA_65537_SHA256_VERIFIER_ID,
                dscVerifierId: DSC_RSA65537_SHA256_4096_VERIFIER_ID,
                pProof: {
                    signatureType: 0,
                    a: prove_proof[0],
                    b: prove_proof[1],
                    c: prove_proof[2],
                    pubSignalsRSA: prove_proof[3],
                    pubSignalsECDSA: new Array(28).fill(0)
                },
                dProof: {
                    a: dsc_proof[0],
                    b: dsc_proof[1],
                    c: dsc_proof[2],
                    pubSignals: dsc_proof[3]
                }
            };
        
            let preRoot = await openPassportRegister.getMerkleRoot();
            await openPassportRegister.registerCommitment(attestation);
            let afterRoot = await openPassportRegister.getMerkleRoot();
        });

        it("Should revert with invalid merkle root", async function() {
            const attestation = {
                proveVerifierId: PROVE_RSA_65537_SHA256_VERIFIER_ID,
                dscVerifierId: DSC_RSA65537_SHA256_4096_VERIFIER_ID,
                pProof: {
                    signatureType: 0,
                    a: prove_proof[0],
                    b: prove_proof[1],
                    c: prove_proof[2],
                    pubSignalsRSA: prove_proof[3],
                    pubSignalsECDSA: new Array(28).fill(0)
                },
                dProof: {
                    a: dsc_proof[0],
                    b: dsc_proof[1],
                    c: dsc_proof[2],
                    // Invalid merkle root
                    pubSignals: [...dsc_proof[3].slice(0, -1), "0x1234"]
                }
            };
        
            await expect(
                openPassportRegister.registerCommitment(attestation)
            ).to.be.revertedWith("Register__InvalidMerkleRoot");
        });

        // it("Should not allow registering same commitment twice", async function() {
        //     const attestation = {
        //         proveVerifierId: PROVE_RSA_65537_SHA256_VERIFIER_ID,
        //         dscVerifierId: DSC_RSA65537_SHA256_4096_VERIFIER_ID,
        //         pProof: {
        //             signatureType: 0,
        //             a: prove_proof[0],
        //             b: prove_proof[1],
        //             c: prove_proof[2],
        //             pubSignalsRSA: prove_proof[3],
        //             pubSignalsECDSA: new Array(28).fill(0)
        //         },
        //         dProof: {
        //             a: dsc_proof[0],
        //             b: dsc_proof[1],
        //             c: dsc_proof[2],
        //             pubSignals: dsc_proof[3]
        //         }
        //     };
            
        //     await openPassportRegister.registerCommitment(attestation);
            
        //     // Try to register the same commitment again
        //     await expect(
        //         openPassportRegister.registerCommitment(attestation)
        //     ).not.to.be.reverted();
        // });

        it("Should emit AddCommitment event with correct values", async function() {
            const attestation = {
                proveVerifierId: PROVE_RSA_65537_SHA256_VERIFIER_ID,
                dscVerifierId: DSC_RSA65537_SHA256_4096_VERIFIER_ID,
                pProof: {
                    signatureType: 0,
                    a: prove_proof[0],
                    b: prove_proof[1],
                    c: prove_proof[2],
                    pubSignalsRSA: prove_proof[3],
                    pubSignalsECDSA: new Array(28).fill(0)
                },
                dProof: {
                    a: dsc_proof[0],
                    b: dsc_proof[1],
                    c: dsc_proof[2],
                    pubSignals: dsc_proof[3]
                }
            };
            
            await expect(openPassportRegister.registerCommitment(attestation))
                .to.emit(openPassportRegister, "ProofValidated")
                .withArgs(
                    dsc_proof[3][DSC_MERKLE_ROOT_INDEX],
                    prove_proof[3][PROVE_RSA_NULLIFIER_INDEX],
                    prove_proof[3][PROVE_RSA_COMMITMENT_INDEX],
                );
        });
    });

    describe("test merkle tree functions", async function() {
        it("Should correctly track merkle tree size", async function() {
            const initialSize = await openPassportRegister.getMerkleTreeSize();
            
            const attestation = {
                proveVerifierId: PROVE_RSA_65537_SHA256_VERIFIER_ID,
                dscVerifierId: DSC_RSA65537_SHA256_4096_VERIFIER_ID,
                pProof: {
                    signatureType: 0,
                    a: prove_proof[0],
                    b: prove_proof[1],
                    c: prove_proof[2],
                    pubSignalsRSA: prove_proof[3],
                    pubSignalsECDSA: new Array(28).fill(0)
                },
                dProof: {
                    a: dsc_proof[0],
                    b: dsc_proof[1],
                    c: dsc_proof[2],
                    pubSignals: dsc_proof[3]
                }
            };
            
            await openPassportRegister.registerCommitment(attestation);
            
            expect(await openPassportRegister.getMerkleTreeSize())
                .to.equal(initialSize + BigInt(1));
        });

        it("Should correctly verify created roots", async function() {
            const attestation = {
                proveVerifierId: PROVE_RSA_65537_SHA256_VERIFIER_ID,
                dscVerifierId: DSC_RSA65537_SHA256_4096_VERIFIER_ID,
                pProof: {
                    signatureType: 0,
                    a: prove_proof[0],
                    b: prove_proof[1],
                    c: prove_proof[2],
                    pubSignalsRSA: prove_proof[3],
                    pubSignalsECDSA: new Array(28).fill(0)
                },
                dProof: {
                    a: dsc_proof[0],
                    b: dsc_proof[1],
                    c: dsc_proof[2],
                    pubSignals: dsc_proof[3]
                }
            };
            
            await openPassportRegister.registerCommitment(attestation);
            const root = await openPassportRegister.getMerkleRoot();
            
            expect(await openPassportRegister.checkRoot(root)).to.be.true;
            expect(await openPassportRegister.checkRoot("0x1234")).to.be.false;
        });
    });

    describe("test owner functions", async function() {
        it("Should allow owner to add commitment directly", async function() {
            const commitment = "123456";
            await openPassportRegister.connect(owner).devAddCommitment(commitment);
            
            const index = await openPassportRegister.indexOf(commitment);
            expect(index).to.equal(BigInt(0));
        });

        it("Should not allow non-owner to add commitment directly", async function() {
            const commitment = "123456";
            await expect(
                openPassportRegister.connect(addr1).devAddCommitment(commitment)
            ).to.be.revertedWithCustomError(openPassportRegister, "OwnableUnauthorizedAccount")
            .withArgs(addr1.address);
        });
    });

    // TODO: make this function able to take inputs
    // TODO: export check flow in other function
    async function generateProofRSAProve() {
        let selector_mode = [0, 0];
        let secret = "42";
        let dsc_secret = "4242";
        let scope = "1";
        let selector_dg1 = new Array(88).fill("1");;
        let selector_older_than = "1";
        let majority = "20";
        let name = fs.readFileSync("../common/ofacdata/inputs/names.json", "utf-8");
        let name_list = JSON.parse(name);
        
        let mockSmt;
        if (fs.existsSync("./test/integrationTest/smt.json")) {
            mockSmt = importSMTFromJsonFile("./test/integrationTest/smt.json") as SMT;
        } else {
            const builtSmt = buildSMT(name_list, "name");
            exportSMTToJsonFile(builtSmt[0], builtSmt[1], builtSmt[2], "./test/integrationTest/smt.json");
            mockSmt = builtSmt[2] as SMT;
        }

        let selector_ofac = "0";
        let forbidden_countries_list = ["AAA"];
        let user_identifier = "70997970C51812dc3A010C7d01b50e0d17dc79C8";
        let user_identifier_type:"ascii" | "hex" | "uuid" | undefined = "hex";

        let prove = generateCircuitInputsProve(
            selector_mode,
            secret,
            dsc_secret,
            mockPassport,
            scope,
            selector_dg1,
            selector_older_than,
            majority,
            mockSmt,
            selector_ofac,
            forbidden_countries_list,
            user_identifier,
            user_identifier_type
        );
        const proof_prove = await groth16.fullProve(
            prove,
            prove_circuits["prove_rsa_65537_sha256"].wasm,
            prove_circuits["prove_rsa_65537_sha256"].zkey
        );

        const vKey_prove = JSON.parse(fs.readFileSync(prove_circuits["prove_rsa_65537_sha256"].vkey) as unknown as string);
        const verified_prove = await groth16.verify(
            vKey_prove,
            proof_prove.publicSignals,
            proof_prove.proof
        )
        // assert(verified_csca == true, 'Should verify')
        const rawCallData_prove = await groth16.exportSolidityCallData(proof_prove.proof, proof_prove.publicSignals);
        let prove_proof = JSON.parse("[" + rawCallData_prove + "]");
        return prove_proof;
    }

    // TODO: make this function able to take inputs
    // TODO: I tried to generate proof in the test code, but it failed. I need to find out why
    // TODO: export check flow in other function
    async function generateMockProofDSC() {
        let dsc_proof = [
            ["0", "0"], 
            [
                ["0", "0"],
                ["0", "0"]
            ],
            ["0", "0"],
            ["0", "0x2bdb3abdd8ee425d31952c6546d98d9ef96adc43bf4a07df1f76210ca345ec3b"]
        ]
        return dsc_proof;
    };

    async function generateProofDSC() {
        let dsc = generateCircuitInputsDSC(
            "4242",
            mock_dsc_sha256_rsa_4096,
            1664
        );

        // TODO: I tried to generate proof in the test code, but it failed.
        console.log(dsc.inputs);
        fs.writeFileSync("dsc.json", JSON.stringify(dsc.inputs));

        const proof_dsc_result = await groth16.fullProve(
            dsc.inputs,
            dsc_circuits["dsc_rsa_65537_sha256_4096"].wasm,
            dsc_circuits["dsc_rsa_65537_sha256_4096"].zkey
        );
        
        const proof_csca = proof_dsc_result.proof;
        const publicSignals_csca = proof_dsc_result.publicSignals;

        const vKey_csca = JSON.parse(fs.readFileSync(dsc_circuits["dsc_rsa_65537_sha256_4096"].vkey) as unknown as string);
        const verified_csca = await groth16.verify(
            vKey_csca,
            publicSignals_csca,
            proof_csca
        )
        // assert(verified_csca == true, 'Should verify')
        console.log("verified_csca: ", verified_csca);
        console.log('\x1b[32m%s\x1b[0m', `Proof verified csca - ${"dsc_rsa_65537_sha256_4096"}`);

        const response = await sendCSCARequest(dsc);
        console.log(response);
        const rawCallData_dsc = await groth16.exportSolidityCallData(response.proof, response.pub_signals);
        let dsc_proof = JSON.parse("[" + rawCallData_dsc + "]");
        return dsc_proof;
    }

    function convertYYMMDDToTimestamp(proveProof: any[], index: number): number {
        const dateDigits = proveProof[3].slice(index, index + 6);
    
        if (dateDigits.length !== 6) {
            throw new Error("Insufficient date digits");
        }

        const digits = dateDigits.map((digit: string) => {
            const num = Number(BigInt(digit));
            if (isNaN(num) || num < 0 || num > 9) {
                throw new Error(`Invalid digit value: ${digit}`);
            }
            return num.toString();
        });
        
        // Correctly join the digits without padding each digit
        const yymmdd = digits.join('');
        console.log("yymmdd: ", yymmdd);
        
        const yy = parseInt(yymmdd.slice(0, 2), 10);
        const mm = parseInt(yymmdd.slice(2, 4), 10);
        const dd = parseInt(yymmdd.slice(4, 6), 10);
        
        const year = 2000 + yy;
        
        if (mm < 1 || mm > 12) {
            throw new Error(`Invalid month value: ${mm}`);
        }
        
        if (dd < 1 || dd > 31) {
            throw new Error(`Invalid day value: ${dd}`);
        }
        
        const date = new Date(year, mm - 1, dd);
        if (date.getFullYear() !== year || date.getMonth() !== mm - 1 || date.getDate() !== dd) {
            throw new Error("Invalid date provided");
        }
        
        const timestamp = Math.floor(date.getTime() / 1000);
        
        return timestamp;
    }
      
});

export function exportSMTToJsonFile(count: number, time: number, smt: SMT, outputPath?: string) {
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
  
  export function importSMTFromJsonFile(filePath?: string): SMT | null {
    try {
      const jsonString = fs.readFileSync(path.resolve(process.cwd(), filePath as string), 'utf8');
      
      const data = JSON.parse(jsonString);
      
      const hash2 = (childNodes: ChildNodes) => (childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes));
      const smt = new SMT(hash2, true);
      smt.import(data.smt);
      
      console.log('Successfully imported SMT from JSON file');
      return smt;
    } catch (error) {
        console.error('Failed to import SMT from JSON file:', error);
        return null;
    }
  }