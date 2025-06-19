import { createHash } from "crypto";

export function calculateUserIdentifierHash(userContextData: string): string {
  const sha256Hash = createHash("sha256")
    .update(Buffer.from(userContextData.slice(2), "hex"))
    .digest();
  const ripemdHash = createHash("ripemd160").update(sha256Hash).digest();
  return "0x" + ripemdHash.toString("hex").padStart(40, "0");
}
