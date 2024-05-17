// we use the sig alg / hash function names returned in modulus extractor and the OID reference
// Example for https://oidref.com/1.2.840.113549.1.1.11: sha256WithRSAEncryption
// the jmrtd lib returns other names (ex: SHA256withRSA), see this page: https://github.com/E3V3A/JMRTD/blob/master/jmrtd/src/org/jmrtd/lds/SODFile.java
// Sometimesm, iOS module too (ex rsaEncryption instead of sha256WithRSAEncryption) 
// So we translate here

export function toStandardName(jmrtdName: string): string {
  switch (jmrtdName) {
    
    // hash functions
    case "SHA-1":
    case "SHA1":
      return "sha1";
    case "SHA-224":
    case "SHA224":
      return "sha224";
    case "SHA-256":
    case "SHA256":
      return "sha256";
    case "SHA-384":
    case "SHA384":
      return "sha384";
    case "SHA-512":
    case "SHA512":
      return "sha512";

    // sig algs
    case "SHA1withECDSA":
      return "ecdsa-with-SHA1";
    case "SHA224withECDSA":
      return "ecdsa-with-SHA224";
    case "SHA256withECDSA":
      return "ecdsa-with-SHA256";
    case "RSA":
      return "rsaEncryption";
    case "MD2withRSA":
      return "md2WithRSAEncryption";
    case "MD4withRSA":
      return "md4WithRSAEncryption";
    case "MD5withRSA":
      return "md5WithRSAEncryption";
    case "SHA1withRSA":
      return "sha1WithRSAEncryption";
    case "SHA224withRSA":
      return "sha224WithRSAEncryption";
    case "SHA256withRSA":
      return "sha256WithRSAEncryption";
    case "SHA384withRSA":
      return "sha384WithRSAEncryption";
    case "SHA512withRSA":
      return "sha512WithRSAEncryption";
    
    case "SAwithRSA/PSS":
    case "SSAwithRSA/PSS":
    case "RSASSA-PSS":
    case "rsassa-pss":
    case "SHA256withRSAandMGF1":
    case "id-mgf1":
      return "rsassaPss";


    // added this one for iOS
    case "rsaEncryption":
    // for security
    case "SHA256WITHRSA":
    case "SHA256withRSA":
    case "sha256withRSA":
    case "sha256withrsa":
    case "SHA256WITHRSAENCRYPTION":
      return "sha256WithRSAEncryption";
    default:
      console.log(`JMRTD sig alg or hash function ${jmrtdName} not found in mapping, returning it as it is`);
      return jmrtdName;
  }
}