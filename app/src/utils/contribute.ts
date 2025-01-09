import axios from 'axios';
import forge from 'node-forge';

import { contribute_publicKey } from '../../../common/src/constants/constants';

export async function contribute(passportData: any): Promise<void> {
  console.log('Contributing...');
  const textToEncrypt = JSON.stringify(passportData);
  console.log('Text to Encrypt:', textToEncrypt);

  try {
    const aesKey = forge.random.getBytesSync(32);
    const iv = forge.random.getBytesSync(16);

    console.log('Generated AES Key (base64):', forge.util.encode64(aesKey));
    console.log('Generated IV (base64):', forge.util.encode64(iv));

    const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(textToEncrypt, 'utf8'));
    cipher.finish();
    const encryptedData = cipher.output.getBytes();

    console.log('Encrypted Data (base64):', forge.util.encode64(encryptedData));

    const publicKey = forge.pki.publicKeyFromPem(contribute_publicKey);
    const encryptedAesKey = publicKey.encrypt(aesKey, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });

    const aesKeyBase64 = forge.util.encode64(encryptedAesKey);
    const ivBase64 = forge.util.encode64(iv);
    const encryptedDataBase64 = forge.util.encode64(encryptedData);

    console.log('Encrypted AES Key (base64):', aesKeyBase64);
    console.log('Encrypted Data (base64):', encryptedDataBase64);

    const data = {
      aesKey: aesKeyBase64,
      iv: ivBase64,
      encryptedData: encryptedDataBase64,
    };

    console.log('Data to be sent:', JSON.stringify(data));

    const response = await axios.post('https://contribute.openpassport.app', {
      nullifier: forge.md.sha256
        .create()
        .update(passportData.encryptedDigest.toString())
        .digest()
        .toHex(),
      data: data,
    });
    console.log('Server Response:', response.data);
  } catch (error) {
    console.error('Encryption Error:', error);
  }
}
