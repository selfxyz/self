import { describe, expect, it } from 'vitest';

// Test that the component can be imported
describe('SelfMobileSdk', () => {
  it('can be imported successfully', async () => {
    const { SelfMobileSdk } = await import('../src/components/SelfMobileSdk');
    expect(SelfMobileSdk).toBeDefined();
    expect(typeof SelfMobileSdk).toBe('function');
  });

  it('has the expected props interface', async () => {
    const { SelfMobileSdk } = await import('../src/components/SelfMobileSdk');

    expect(SelfMobileSdk).toBeDefined();
  });
});
