import { bigIntToHex, castToUUID } from '../../common/src/utils/utils';

export class OpenPassportVerifierReport {
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
  dsc: boolean = true;
  valid: boolean = true;

  public user_identifier: bigint;
  public nullifier: bigint;

  constructor() {}

  exposeAttribute(
    attribute: keyof OpenPassportVerifierReport,
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

  getUUID() {
    return castToUUID(this.user_identifier);
  }

  getHexUUID() {
    return bigIntToHex(this.user_identifier);
  }

  getNullifier() {
    return bigIntToHex(this.nullifier);
  }
}
