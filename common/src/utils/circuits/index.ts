export {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
  generateCircuitInputsOfac,
} from './generateInputs.js';

export { getCircuitNameFromPassportData } from './circuitsName.js';

export {
  formatForbiddenCountriesListFromCircuitOutput,
  getAttributeFromUnpackedReveal,
  unpackReveal,
  getOlderThanFromCircuitOutput,
  formatAndUnpackReveal,
  formatAndUnpackForbiddenCountriesList,
  revealBitmapFromMapping,
  revealBitmapFromAttributes,
} from './formatOutputs.js';

export { formatCountriesList, reverseBytes, reverseCountryBytes } from './formatInputs.js';

export {
  castFromUUID,
  bigIntToHex,
  hexToUUID,
  castToUUID,
  castToUserIdentifier,
  castToAddress,
  castFromScope,
  castToScope,
  stringToAsciiBigIntArray,
  validateUserId,
} from './uuid.js';

export type { UserIdType } from './uuid.js';
