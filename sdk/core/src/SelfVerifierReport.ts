export class SelfVerifierReport {
  scope: boolean = true;
  merkle_root_commitment: boolean = true;
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
  proof: boolean = true;
  valid: boolean = true;
  ofac: boolean = true;
  merkle_root_ofac: boolean = true;
  forbidden_countries_list: boolean = true;

  public user_identifier: string;
  public nullifier: string;

  constructor() {}

  exposeAttribute(
    attribute: keyof SelfVerifierReport,
    value: any = '',
    expectedValue: any = ''
  ) {
    console.error(
      "%c attributes don't match",
      'color: red',
      attribute,
      'value:',
      value,
      'expectedValue:',
      expectedValue
    );
    (this[attribute] as boolean) = false;
    this.valid = false;
  }

  toString() {
    return JSON.stringify(this);
  }
}
