import { ECDSA_K_LENGTH_FACTOR, k_dsc, k_dsc_ecdsa } from '../../common/src/constants/constants';
import { parseDSC } from '../../common/src/utils/certificates/handleCertificate';
import { bigIntToHex, castToScope, castToUUID, UserIdType } from '../../common/src/utils/utils';
import { parsePublicSignalsProve } from './OpenPassportVerifier';
