import type { DocumentCategory } from '../foundation/types/document.js';
import type { IDocument } from '../documents/interface.js';
import { PassportDocument } from '../documents/passport/adapter.js';
import { AadhaarDocument } from '../documents/aadhaar/adapter.js';
import { KycDocument } from '../documents/kyc/adapter.js';
import type {
  DiscloseInputsFor,
  DiscloseOptsFor,
  DscInputsFor,
  ICircuitInputGenerator,
  PassportDiscloseOpts,
  PassportRegisterOpts,
  RegisterInputsFor,
  RegisterOptsFor,
} from './types.js';
import { generatePassportRegisterInputs } from './inputs/register.js';
import { generatePassportDscInputs } from './inputs/dsc.js';
import { generatePassportDiscloseInputs } from './inputs/disclose.js';
import { generateAadhaarRegisterInputs } from './inputs/register-aadhaar.js';
import { generateAadhaarDiscloseInputs } from './inputs/disclose-aadhaar.js';
import type { AadhaarDiscloseInputOpts } from './inputs/disclose-aadhaar.js';
import { generateKycRegisterInputs } from './inputs/register-kyc.js';
import { generateKycDiscloseInputs } from './inputs/disclose-kyc.js';
import type { KycDiscloseInputOpts } from './inputs/disclose-kyc.js';

function assertPassport(doc: IDocument): PassportDocument {
  if (!(doc instanceof PassportDocument)) {
    throw new Error(`Expected PassportDocument, got category: ${doc.category}`);
  }
  return doc;
}

function assertAadhaar(doc: IDocument): AadhaarDocument {
  if (!(doc instanceof AadhaarDocument)) {
    throw new Error(`Expected AadhaarDocument, got category: ${doc.category}`);
  }
  return doc;
}

function assertKyc(doc: IDocument): KycDocument {
  if (!(doc instanceof KycDocument)) {
    throw new Error(`Expected KycDocument, got category: ${doc.category}`);
  }
  return doc;
}

function assertExhaustive(category: never): never {
  throw new Error(`Unsupported document category: ${category}`);
}

class CircuitInputGenerator implements ICircuitInputGenerator {
  generateRegisterInputs<T extends IDocument>(
    doc: T,
    secret: string,
    serializedDscTree: string,
    opts?: RegisterOptsFor<T>,
  ): RegisterInputsFor<T> {
    const category: DocumentCategory = doc.category;
    switch (category) {
      case 'passport':
      case 'id_card':
        return generatePassportRegisterInputs(
          secret,
          assertPassport(doc).raw,
          serializedDscTree,
          (opts as PassportRegisterOpts | undefined)?.useTestPadding,
        ) as RegisterInputsFor<T>;
      case 'aadhaar': {
        const aadhaarDoc = assertAadhaar(doc);
        const result = generateAadhaarRegisterInputs(aadhaarDoc.raw.qrData, secret, {
          pubKey: aadhaarDoc.getPubKeyModulus(),
          signature: aadhaarDoc.getSignatureBigInt(),
        });
        return result.inputs as unknown as RegisterInputsFor<T>;
      }
      case 'kyc': {
        const kycDoc = assertKyc(doc);
        const kycRaw = kycDoc.raw;
        return generateKycRegisterInputs(
          kycRaw.serializedApplicantInfo,
          kycRaw.signature,
          kycRaw.pubkey as [string, string],
          secret,
        ) as unknown as RegisterInputsFor<T>;
      }
      default:
        return assertExhaustive(category);
    }
  }

  generateDscInputs<T extends IDocument>(doc: T, serializedCscaTree: string[][]): DscInputsFor<T> {
    const category: DocumentCategory = doc.category;
    switch (category) {
      case 'passport':
      case 'id_card':
        return generatePassportDscInputs(
          assertPassport(doc).raw,
          serializedCscaTree,
        ) as DscInputsFor<T>;
      case 'aadhaar':
        throw new Error('Aadhaar DSC input generation not applicable');
      case 'kyc':
        throw new Error('KYC DSC input generation not applicable');
      default:
        return assertExhaustive(category);
    }
  }

  generateDiscloseInputs<T extends IDocument>(
    doc: T,
    secret: string,
    opts: DiscloseOptsFor<T>,
  ): DiscloseInputsFor<T> {
    const category: DocumentCategory = doc.category;
    const attestation_id = doc.getAttestationId();
    switch (category) {
      case 'passport':
      case 'id_card': {
        const pOpts = opts as PassportDiscloseOpts;
        const passportDoc = assertPassport(doc);
        const { selectorDg1, selectorOlderThan, selectorOfac } =
          passportDoc.buildDisclosureSelector(pOpts.fieldsToReveal);
        return generatePassportDiscloseInputs(
          secret,
          attestation_id,
          passportDoc.raw,
          pOpts.scope,
          selectorDg1,
          selectorOlderThan,
          pOpts.merkletree,
          pOpts.majority,
          pOpts.passportNo_smt,
          pOpts.nameAndDob_smt,
          pOpts.nameAndYob_smt,
          selectorOfac,
          pOpts.forbidden_countries_list,
          pOpts.user_identifier,
        ) as DiscloseInputsFor<T>;
      }
      case 'aadhaar': {
        const aadhaarDoc = assertAadhaar(doc);
        const aOpts = opts as AadhaarDiscloseInputOpts;
        const result = generateAadhaarDiscloseInputs(aadhaarDoc.raw.qrData, secret, aOpts);
        return result.inputs as unknown as DiscloseInputsFor<T>;
      }
      case 'kyc': {
        const kycDoc = assertKyc(doc);
        const kOpts = opts as KycDiscloseInputOpts;
        const result = generateKycDiscloseInputs(kycDoc.raw.serializedApplicantInfo, secret, kOpts);
        return result.inputs as unknown as DiscloseInputsFor<T>;
      }
      default:
        return assertExhaustive(category);
    }
  }
}

export function createCircuitInputGenerator(): ICircuitInputGenerator {
  return new CircuitInputGenerator();
}
