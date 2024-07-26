import { CircuitName } from "../../../app/src/utils/zkeyDownload";

type DisclosureOption = "required" | "optional";

type Disclosure = {
  [key: string]: DisclosureOption;
};

export type AppType = {
  id: string;

  // AppScreen UI
  title: string,
  description: string,
  background?: string,
  colorOfTheText: string,
  selectable: boolean,
  icon: any,
  tags: React.JSX.Element[]

  // ProveScreen UI
  name: string;
  disclosureOptions: Disclosure | {};

  beforeSendText1: string;
  beforeSendText2: string;
  sendButtonText: string;
  sendingButtonText: string;

  successTitle: string;
  successText: string;

  //successComponent: () => React.JSX.Element;
  finalButtonAction: () => void;
  finalButtonText: string;

  scope: string;
  circuit: CircuitName; // circuit and witness calculator name

  fields: React.FC[];

  handleProve: () => void;
  handleSendProof: () => void;
}

export function createAppType(data: Partial<AppType>): AppType {
  return {
    id: data.id || "",
    title: data.title || "",
    description: data.description || "",
    background: data.background || "",
    colorOfTheText: data.colorOfTheText || "",
    selectable: data.selectable !== undefined ? data.selectable : false,
    icon: data.icon || null,
    tags: data.tags || [],

    name: data.name || "",
    disclosureOptions: data.disclosureOptions || {},

    beforeSendText1: data.beforeSendText1 || "",
    beforeSendText2: data.beforeSendText2 || "",
    sendButtonText: data.sendButtonText || "",
    sendingButtonText: data.sendingButtonText || "",

    successTitle: data.successTitle || "",
    successText: data.successText || "",

    //successComponent: data.successComponent as any,
    finalButtonAction: data.finalButtonAction || (() => { }),
    finalButtonText: data.finalButtonText || "",

    scope: data.scope || "",
    circuit: data.circuit || ("" as CircuitName), // Assuming a default value is acceptable

    fields: data.fields || [],

    handleProve: data.handleProve || (() => { }),
    handleSendProof: data.handleSendProof || (() => { }),
  };
}
