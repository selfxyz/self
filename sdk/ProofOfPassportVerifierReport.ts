export class ProofOfPassportVerifierReport {
    scope: boolean = true;
    merkle_root: boolean = true;
    attestation_id: boolean = true;
    current_date: boolean = true;
    issuing_state: boolean = true;
    name: boolean = true;
    passport_number: boolean = true;
    nationality: boolean = true;
    date_of_birth: boolean = true;
    gender: boolean = true;
    expiry_date: boolean = true;
    older_than: boolean = true;
    owner_of: boolean = true;
    proof: boolean = true;

    valid: boolean = true;

    public user_identifier: number;
    public nullifier: number;

    constructor() { }

    exposeAttribute(attribute: keyof ProofOfPassportVerifierReport, value: any = "", expectedValue: any = "") {
        console.log('exposeAttribute', attribute, "value:", value, "expectedValue:", expectedValue);
        (this[attribute] as boolean) = false;
        this.valid = false;
    }

    toJson() {
        return JSON.stringify(this);
    }

}
