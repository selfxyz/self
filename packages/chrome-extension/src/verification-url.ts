export interface SelfAppLike {
  sessionId: string;
  scope: string;
  userId: string;
  userIdType?: string;
  appName?: string;
  endpoint: string;
  endpointType?: string;
  version?: number;
  chainID?: number;
  userDefinedData?: string;
  selfDefinedData?: string;
  devMode?: boolean;
  disclosures?: Record<string, unknown>;
}

const BOOLEAN_DISCLOSURES = [
  'issuing_state',
  'name',
  'passport_number',
  'nationality',
  'date_of_birth',
  'gender',
  'expiry_date',
  'ofac',
];

export function disclosuresToCsv(disclosures: Record<string, unknown> = {}): {
  disclosures: string;
  excludedCountries: string;
} {
  const items: string[] = [];
  for (const key of BOOLEAN_DISCLOSURES) {
    if (disclosures[key] === true) items.push(key);
  }
  const minimumAge = disclosures.minimumAge;
  if (typeof minimumAge === 'number' && Number.isFinite(minimumAge)) {
    items.push(`minimumAge:${minimumAge}`);
  }
  const excluded = Array.isArray(disclosures.excludedCountries)
    ? disclosures.excludedCountries.join(',')
    : '';
  return { disclosures: items.join(','), excludedCountries: excluded };
}

export function selfAppToPopupQuery(selfApp: SelfAppLike): string {
  const { disclosures, excludedCountries } = disclosuresToCsv(
    selfApp.disclosures,
  );
  const staging =
    selfApp.endpointType?.startsWith('staging') || selfApp.devMode === true;

  const params = new URLSearchParams();
  params.set('ext_mode', 'embed');
  params.set('verificationId', selfApp.sessionId);
  params.set('userId', selfApp.userId);
  params.set('scope', selfApp.scope);
  if (disclosures) params.set('disclosures', disclosures);
  if (excludedCountries) params.set('excludedCountries', excludedCountries);
  if (selfApp.appName) params.set('appName', selfApp.appName);
  if (selfApp.endpoint) params.set('appEndpoint', selfApp.endpoint);
  if (selfApp.endpointType) params.set('endpointType', selfApp.endpointType);
  if (selfApp.userIdType) params.set('userIdType', selfApp.userIdType);
  if (typeof selfApp.version === 'number')
    params.set('version', String(selfApp.version));
  if (typeof selfApp.chainID === 'number')
    params.set('chainID', String(selfApp.chainID));
  if (selfApp.userDefinedData)
    params.set('userDefinedData', selfApp.userDefinedData);
  if (selfApp.selfDefinedData)
    params.set('selfDefinedData', selfApp.selfDefinedData);
  params.set('environment', staging ? 'stg' : 'prod');
  params.set('timestamp', String(Date.now()));

  return params.toString();
}
