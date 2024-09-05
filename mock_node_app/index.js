const { OpenPassport2StepVerifier, OpenPassport1StepVerifier, OpenPassportQRcode } = require('@proofofpassport/sdk');

console.log('OpenPassport2StepVerifier:', typeof OpenPassport2StepVerifier);
console.log('OpenPassport1StepVerifier:', typeof OpenPassport1StepVerifier);

try {
    const { OpenPassportQRcode } = require('@proofofpassport/sdk');
    console.log('QRCodeComponent:', typeof OpenPassportQRcode);
} catch (error) {
    console.log('QRCodeComponent is not available in Node.js environment.');
}