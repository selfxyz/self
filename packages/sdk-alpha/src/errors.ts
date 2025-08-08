export type SdkErrorCategory =
  | 'scanner'
  | 'network'
  | 'protocol'
  | 'proof'
  | 'crypto'
  | 'validation'
  | 'config';
export function sdkError(
  message: string,
  code: string,
  category: SdkErrorCategory,
  retryable = false,
) {
  return Object.assign(new Error(message), { code, category, retryable });
}
export function notImplemented(name: string) {
  return sdkError(
    `${name} adapter not provided`,
    'SELF_ERR_ADAPTER_MISSING',
    'config',
    false,
  );
}
