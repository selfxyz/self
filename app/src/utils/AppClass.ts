// AppClass.ts

type Disclosure = {
    [key: string]: boolean;
};

export class App {
    id: string;
    name: string;
    disclosure: Disclosure;

    constructor(id: string, name: string, disclosure: Disclosure) {
        this.id = id;
        this.name = name;
        this.disclosure = disclosure;
    }
}

// Create instances of the App class
export const gitcoin = new App("gitcoin", "Gitcoin", {});
export const soulbond = new App("soulbond", "Soulbond token", { nationality: false, expiry_date: false });
export const zuzalu = new App("zuzalu", "Zupass", { date_of_birth: false });
