export class ProofOfPassportVerifierReport {
    scope: boolean = false;
    merkle_root: boolean = false;
    attestation_id: boolean = false;
    current_date: boolean = false;
    issuing_state: boolean = false;
    name: boolean = false;
    passport_number: boolean = false;
    nationality: boolean = false;
    date_of_birth: boolean = false;
    gender: boolean = false;
    expiry_date: boolean = false;
    older_than: boolean = false;
    owner_of: boolean = false;
    proof: boolean = false;

    valid: boolean = true;

    public user_identifier: number;
    public nullifier: number;

    constructor() { }

    exposeAttribute(attribute: keyof ProofOfPassportVerifierReport) {
        (this[attribute] as boolean) = true;
        this.valid = false;
    }

    toJson() {
        return JSON.stringify(this);
    }

}
