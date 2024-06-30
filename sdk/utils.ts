import { ethers } from "ethers";
import { getCurrentDateYYMMDD } from "../common/src/utils/utils";
import { REGISTER_ABI, REGISTER_CONTRACT_ADDRESS } from "../common/src/constants/constants";

export const attributeToGetter = {
    "nationality": "getNationalityOf",
    "expiry_date": "getExpiryDateOf",
    "older_than": "getOlderThanOf"
}

export function getCurrentDateFormatted() {
    return getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString());
}

export async function checkMerkleRoot(rpcUrl: string, merkleRoot: number) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(REGISTER_CONTRACT_ADDRESS, REGISTER_ABI, provider);
    return await contract.checkRoot(merkleRoot);
}

export function parsePublicSignals(publicSignals) {
    return {
        nullifier: publicSignals[0],
        revealedData_packed: [publicSignals[1], publicSignals[2], publicSignals[3]],
        attestation_id: publicSignals[4],
        merkle_root: publicSignals[5],
        scope: publicSignals[6],
        current_date: [publicSignals[7], publicSignals[8], publicSignals[9], publicSignals[10], publicSignals[11], publicSignals[12]],
        user_identifier: publicSignals[13],
    }
}

export function unpackReveal(revealedData_packed: string[]): string[] {

    const bytesCount = [31, 31, 28]; // nb of bytes in each of the first three field elements
    const bytesArray = revealedData_packed.flatMap((element: string, index: number) => {
        const bytes = bytesCount[index];
        const elementBigInt = BigInt(element);
        const byteMask = BigInt(255); // 0xFF
        const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
            return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
        });
        return bytesOfElement;
    });

    return bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
}
