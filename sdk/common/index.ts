import { CertificateData, PublicKeyDetailsECDSA, PublicKeyDetailsRSA } from "openpassport-common/utils/certificate_parsing/dataStructure";
import { parseCertificate } from "openpassport-common/utils/certificate_parsing/parseCertificate";
import { parseCertificateSimple } from "openpassport-common/utils/certificate_parsing/parseCertificateSimple";
import { findStartPubKeyIndex } from "openpassport-common/utils/passports/passport";
import { parseDscCertificateData } from "openpassport-common/utils/passports/passport_parsing/parseDscCertificateData";
import { getLeafCscaTree, getLeafDscTree } from "openpassport-common/utils/trees";
import { genMockIdDoc } from "openpassport-common/utils/passports/genMockIdDoc";

// TODO @Aaronmgdr these should be imported via package not relative paths

export { CertificateData, findStartPubKeyIndex, getLeafCscaTree, getLeafDscTree, parseCertificate, parseCertificateSimple, parseDscCertificateData, PublicKeyDetailsECDSA, PublicKeyDetailsRSA, genMockIdDoc };
