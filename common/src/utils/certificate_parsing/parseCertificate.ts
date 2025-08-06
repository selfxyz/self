import type { CertificateData } from './dataStructure.js';
import { parseCertificateSimple } from './parseCertificateSimple.js';

export async function parseCertificate(pem: string, fileName: string): Promise<CertificateData> {
  // Check if we're in a Node.js environment
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const isWeb = typeof window !== 'undefined';

  if (!isNode || isWeb) {
    // In web environment, fall back to parseCertificateSimple
    console.warn(
      'parseCertificate: Node.js features not available in web environment, using parseCertificateSimple'
    );
    return parseCertificateSimple(pem);
  }

  try {
    let certificateData = parseCertificateSimple(pem);

    // Dynamically import Node.js-specific functionality using string concatenation to hide from bundlers
    // This ensures web bundlers won't try to resolve Node.js modules during static analysis
    const moduleName = './parseCertificate' + 'Node.js';
    const nodeModule = await import(moduleName);
    certificateData = nodeModule.addOpenSslInfo(certificateData, pem, fileName);

    return certificateData;
  } catch (error) {
    console.error(`Error processing certificate ${fileName}:`, error);
    throw error;
  }
}
