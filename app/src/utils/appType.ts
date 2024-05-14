import { CircuitName } from "./zkeyDownload";

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

  successComponent: () => React.JSX.Element;
  finalButtonAction: () => void;
  finalButtonText: string;

  circuit: CircuitName; // circuit and witness calculator name
  
  fields: React.FC[];

  handleProve: () => void;
  handleSendProof: () => void;
}
