import { API_URL, API_URL_STAGING } from '../foundation/constants/network.js';

export function getCSCAFromSKI(
  ski: string,
  skiPem: Record<string, string>
): string {
  const normalizedSki = ski.replace(/\s+/g, '').toLowerCase();
  let cscaPem = skiPem[normalizedSki] ?? null;
  if (!cscaPem) {
    console.log(
      '\x1b[33m%s\x1b[0m',
      `[WRN] CSCA with SKI ${ski} not found`
    );
    throw new Error(
      `CSCA not found, authorityKeyIdentifier: ${ski}`
    );
  }
  if (!cscaPem.includes('-----BEGIN CERTIFICATE-----')) {
    cscaPem = `-----BEGIN CERTIFICATE-----\n${cscaPem}\n-----END CERTIFICATE-----`;
  }
  return cscaPem;
}

export async function getSKIPEM(
  environment: 'staging' | 'production'
): Promise<Record<string, string>> {
  const skiPemUrl = (environment === 'staging' ? API_URL_STAGING : API_URL) + '/ski-pem';
  console.log('Fetching SKI-PEM mapping from:', skiPemUrl);
  try {
    const response = await fetch(skiPemUrl);
    if (!response.ok) {
      throw new Error(`HTTP error fetching ${skiPemUrl}! status: ${response.status}`);
    }

    const responseText = await response.text();
    const jsonData = JSON.parse(responseText);

    if (
      !jsonData ||
      typeof jsonData !== 'object' ||
      !jsonData.data ||
      typeof jsonData.data !== 'object'
    ) {
      console.error('Unexpected JSON structure received:', jsonData);
      throw new Error('Unexpected JSON structure received from SKI-PEM endpoint.');
    }

    console.log('Parsed SKI-PEM data received.');
    return jsonData.data;
  } catch (error) {
    console.error('Error fetching or parsing ski-pem:', error);
    throw new Error(
      `Failed to get SKIPEM: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
