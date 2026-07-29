
import { createServer } from 'node:http';

import { AllIds, DefaultConfigStore, SelfBackendVerifier } from '@selfxyz/core';

const PORT = Number(process.env.PORT ?? 3111);
const SCOPE = 'ext-spike-demo';
const VERIFY_ENDPOINT = process.env.VERIFY_ENDPOINT ?? 'https://self-ext-demo.example/api/verify';
const MINIMUM_AGE = 18;
const MOCK_DOCS = (process.env.MOCK_DOCS ?? 'true') !== 'false';

const verifier = new SelfBackendVerifier(
  SCOPE,
  VERIFY_ENDPOINT,
  MOCK_DOCS,
  AllIds,
  new DefaultConfigStore({ minimumAge: MINIMUM_AGE }),
  'uuid',
);

let lastVerification = null;

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/last-verification') {
    return json(res, 200, lastVerification);
  }

  if (req.method === 'POST' && req.url === '/api/verify') {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', async () => {
      try {
        const { attestationId, proof, publicSignals, pubSignals, userContextData } = JSON.parse(raw);
        const result = await verifier.verify(
          Number(attestationId),
          proof,
          publicSignals ?? pubSignals,
          userContextData,
        );
        const verified = result.isValidDetails?.isValid === true || result.isValid === true;
        console.log(`[backend] verify attestationId=${attestationId} -> ${verified}`);
        if (verified) {
          lastVerification = {
            verified: true,
            minimumAge: MINIMUM_AGE,
            timestamp: new Date().toISOString(),
            nationality: result.discloseOutput?.nationality ?? result.credentialSubject?.nationality,
          };
        }
        return json(res, 200, { status: 'success', result: verified });
      } catch (error) {
        console.error('[backend] verify failed:', error?.message ?? error);
        return json(res, 200, {
          status: 'error',
          result: false,
          reason: error?.message ?? 'verification_failed',
        });
      }
    });
    return;
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`[backend] listening on :${PORT}`);
  console.log(
    `[backend] scope=${SCOPE} endpoint=${VERIFY_ENDPOINT} minimumAge=${MINIMUM_AGE} registry=${MOCK_DOCS ? 'staging/mock' : 'production/real'}`,
  );
});
