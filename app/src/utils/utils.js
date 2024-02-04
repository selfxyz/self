// Function to extract information from a two-line MRZ.
// The actual parsing would depend on the standard being used (TD1, TD2, TD3, MRVA, MRVB).
export function extractMRZInfo(mrzString) {
    const mrzLines = mrzString.split('\n');
  
    if (mrzLines.length < 2) {
      throw new Error('Invalid MRZ format: Expected two lines of MRZ data');
    }
  
    let documentNumber = mrzLines[1].slice(0, 9).replace(/</g, '').trim();
    const birthDate = mrzLines[1].slice(13, 19).trim();
    const expiryDate = mrzLines[1].slice(21, 27).trim();
  
    return {
      documentNumber,
      birthDate,
      expiryDate
    };
  }

  export const Steps = {
    MRZ_SCAN: 1,
    MRZ_SCAN_COMPLETED: 2,
    NFC_SCANNING: 3,
    NFC_SCAN_COMPLETED: 4,
    GENERATING_PROOF: 5,
    PROOF_GENERATED: 6
  };

  