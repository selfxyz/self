type Disclosure = {
    [key: string]: boolean;
};

export class App {
    id: string;
    name: string;
    disclosure: Disclosure;
    mintphrase: string;
    disclosurephrase: string;

    constructor(id: string, name: string, disclosure: Disclosure, mintphrase: string, disclosurephrase: string) {
        this.id = id;
        this.name = name;
        this.disclosure = disclosure;
        this.disclosurephrase = disclosurephrase;
        this.mintphrase = mintphrase;
    }
}

export const gitcoin = new App("gitcoin", "Gitcoin", {}, "Add to Gitcoin passport", "Gitcoin passport doesn't require to disclosure any data.");
export const soulbond = new App("soulbond", "Soulbond token", { nationality: false, expiry_date: false }, "Mint Soulbond token", "Disclosure the information you want and mint your SBT.");
export const zuzalu = new App("zuzalu", "Zupass", { date_of_birth: false }, "Add to Zupass", "Zupass requires the following information:");
