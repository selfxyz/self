import { describe, expect, it } from 'vitest';

import { notImplemented, SdkError, sdkError } from '../src/errors';

describe('SdkError', () => {
  it('creates SdkError with correct properties', () => {
    const error = new SdkError('Test message', 'TEST_CODE', 'config', false);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SdkError);
    expect(error.name).toBe('SdkError');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.category).toBe('config');
    expect(error.retryable).toBe(false);
  });

  it('creates SdkError with retryable flag', () => {
    const error = new SdkError('Retryable error', 'RETRY_CODE', 'network', true);

    expect(error.retryable).toBe(true);
    expect(error.category).toBe('network');
  });

  it('supports ErrorOptions with cause', () => {
    const originalError = new Error('Original error');
    const sdkError = new SdkError('Wrapped error', 'WRAP_CODE', 'crypto', false, {
      cause: originalError,
    });

    expect(sdkError.cause).toBe(originalError);
  });

  it('has readonly properties', () => {
    const error = new SdkError('Test', 'CODE', 'scanner', false);

    // TypeScript readonly properties are compile-time only, so we just verify they exist
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('category');
    expect(error).toHaveProperty('retryable');

    // Verify the properties have the expected values
    expect(error.code).toBe('CODE');
    expect(error.category).toBe('scanner');
    expect(error.retryable).toBe(false);
  });
});

describe('sdkError factory function', () => {
  it('creates SdkError instance', () => {
    const error = sdkError('Factory message', 'FACTORY_CODE', 'validation', true);

    expect(error).toBeInstanceOf(SdkError);
    expect(error.message).toBe('Factory message');
    expect(error.code).toBe('FACTORY_CODE');
    expect(error.category).toBe('validation');
    expect(error.retryable).toBe(true);
  });

  it('defaults retryable to false', () => {
    const error = sdkError('Default message', 'DEFAULT_CODE', 'protocol');

    expect(error.retryable).toBe(false);
  });
});

describe('notImplemented factory function', () => {
  it('creates SdkError for missing adapter', () => {
    const error = notImplemented('scanner');

    expect(error).toBeInstanceOf(SdkError);
    expect(error.message).toBe('scanner adapter not provided');
    expect(error.code).toBe('SELF_ERR_ADAPTER_MISSING');
    expect(error.category).toBe('config');
    expect(error.retryable).toBe(false);
  });
});
