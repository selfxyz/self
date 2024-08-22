export type CircuitName = "register_sha256WithRSAEncryption_65537" | "disclose";

//type DisclosureOption = "required" | "optional";

interface Disclosure {
  [key: string]: string;
}

export interface AppType {
  id?: string;
  name: string;
  scope: string;
  callbackEndPoint?: string;
  userId: string;
  disclosureOptions: Disclosure;
  circuit: string;
  title?: string;
  description?: string;
  background?: string;
  colorOfTheText?: string;
  icon?: unknown;
}

export function createAppType(data: AppType): AppType {
  return {
    //id: data.id || "",
    ...data,
    name: data.name,
    scope: data.scope,
    //callbackEndPoint: data.callbackEndPoint,
    userId: data.userId,
    disclosureOptions: data.disclosureOptions,
    // circuit: data.circuit || "prove_rsa_65537_sha256",
    circuit: "prove_rsa_65537_sha256",
  };
}