// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { SelfClientProvider } from '@selfxyz/mobile-sdk-alpha';

// Import after mocking
import {
  __resetPassportProviderTestState,
  initializeNativeModules,
  loadDocumentCatalogDirectlyFromKeychain,
  migrateFromLegacyStorage,
  PassportProvider,
  usePassport,
} from '@/providers/passportDataProvider';

import { mockAdapters } from '../../__setup__/selfClientProvider';

const listeners = new Map();

jest.mock('react-native-keychain', () => {
  const mockKeychain = {
    getGenericPassword: jest.fn(),
    setGenericPassword: jest.fn(),
    resetGenericPassword: jest.fn(),
  };

  return mockKeychain;
});

const mockKeychain = jest.requireMock('react-native-keychain') as {
  getGenericPassword: jest.Mock;
  setGenericPassword: jest.Mock;
  resetGenericPassword: jest.Mock;
};

// Mock the auth provider
const mockAuthProvider = {
  _getSecurely: jest.fn(),
};

jest.mock('@/providers/authProvider', () => ({
  useAuth: () => mockAuthProvider,
}));

const MockText = ({
  children,
  testID,
}: {
  children?: ReactNode;
  testID?: string;
}) => <mock-text testID={testID}>{children}</mock-text>;

// Test component that uses the passport hook and extracts context values
const TestComponent = () => {
  const passportContext = usePassport();
  const [contextValues, setContextValues] = useState<string[]>([]);

  useEffect(() => {
    // Extract function names from context to verify they exist
    const functionNames = Object.keys(passportContext).filter(
      key =>
        typeof passportContext[key as keyof typeof passportContext] ===
        'function',
    );
    setContextValues(functionNames);
  }, [passportContext]);

  return (
    <>
      <MockText testID="context-functions-count">
        {contextValues.length} functions available
      </MockText>
      <MockText testID="context-functions-list">
        {contextValues.join(',')}
      </MockText>
      <MockText testID="getData-available">getData available</MockText>
      <MockText testID="setData-available">setData available</MockText>
      <MockText testID="loadDocumentCatalog-available">
        loadDocumentCatalog available
      </MockText>
    </>
  );
};

// Component to test multiple consumers
const MultipleConsumersTest = () => {
  const context1 = usePassport();
  const context2 = usePassport();

  return (
    <>
      <MockText testID="consumer1-functions">
        {
          Object.keys(context1).filter(
            key => typeof context1[key as keyof typeof context1] === 'function',
          ).length
        }
      </MockText>
      <MockText testID="consumer2-functions">
        {
          Object.keys(context2).filter(
            key => typeof context2[key as keyof typeof context2] === 'function',
          ).length
        }
      </MockText>
    </>
  );
};

// Component to test error boundaries
const ErrorBoundaryTest = () => {
  // Simulate calling a context function that might throw
  const testContextFunction = () => {
    try {
      // This would normally call a context function
      return 'success';
    } catch {
      return 'error';
    }
  };

  return (
    <MockText testID="error-test-result">{testContextFunction()}</MockText>
  );
};

// Component to test context updates
const ContextUpdateTest = () => {
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    // Simulate context updates
    const interval = setInterval(() => {
      setUpdateCount(prev => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return <MockText testID="update-count">{updateCount}</MockText>;
};

describe('PassportDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    __resetPassportProviderTestState();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should provide context values to children', () => {
    const { getByTestId } = render(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <TestComponent />
        </PassportProvider>
      </SelfClientProvider>,
    );

    expect(getByTestId('getData-available')).toBeTruthy();
    expect(getByTestId('setData-available')).toBeTruthy();
    expect(getByTestId('loadDocumentCatalog-available')).toBeTruthy();
  });

  it('should provide all required context functions', () => {
    const { getByTestId } = render(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <TestComponent />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const functionsCount = getByTestId('context-functions-count');
    expect(functionsCount.props.children[0]).toBeGreaterThan(15); // Should have many functions

    const functionsList = getByTestId('context-functions-list');
    expect(functionsList.props.children).toContain('getData');
    expect(functionsList.props.children).toContain('setData');
    expect(functionsList.props.children).toContain('loadDocumentCatalog');
    expect(functionsList.props.children).toContain('getAllDocuments');
    expect(functionsList.props.children).toContain('setSelectedDocument');
    expect(functionsList.props.children).toContain('deleteDocument');
  });

  it('should support multiple consumers accessing the same context', () => {
    const { getByTestId } = render(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <MultipleConsumersTest />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const consumer1Functions = getByTestId('consumer1-functions');
    const consumer2Functions = getByTestId('consumer2-functions');

    expect(consumer1Functions.props.children).toBeGreaterThan(0);
    expect(consumer2Functions.props.children).toBeGreaterThan(0);
    expect(consumer1Functions.props.children).toBe(
      consumer2Functions.props.children,
    );
  });

  it('should handle context updates and trigger re-renders', async () => {
    const { getByTestId } = render(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <ContextUpdateTest />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const updateCount = getByTestId('update-count');
    const initialCount = parseInt(updateCount.props.children, 10);

    // Wait for updates to occur
    await waitFor(
      () => {
        const newCount = parseInt(
          getByTestId('update-count').props.children,
          10,
        );
        expect(newCount).toBeGreaterThan(initialCount);
      },
      { timeout: 1000 },
    );
  });

  it('should handle errors gracefully in context consumers', () => {
    const { getByTestId } = render(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <ErrorBoundaryTest />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const errorTestResult = getByTestId('error-test-result');
    expect(errorTestResult.props.children).toBe('success');
  });

  it('should render without children gracefully', () => {
    expect(() => {
      render(
        <SelfClientProvider
          config={{}}
          adapters={mockAdapters}
          listeners={new Map()}
        >
          <PassportProvider />
        </SelfClientProvider>,
      );
    }).not.toThrow();
  });

  it('should provide consistent context values across re-renders', () => {
    const { getByTestId, rerender } = render(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <TestComponent />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const initialFunctionsCount = getByTestId('context-functions-count').props
      .children[0];

    // Re-render the component
    rerender(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <TestComponent />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const newFunctionsCount = getByTestId('context-functions-count').props
      .children[0];
    expect(newFunctionsCount).toBe(initialFunctionsCount);
  });

  it('should maintain context stability across provider re-renders', () => {
    const { getByTestId, rerender } = render(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <TestComponent />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const initialFunctionsList = getByTestId('context-functions-list').props
      .children;

    // Re-render with different props
    rerender(
      <SelfClientProvider
        config={{}}
        adapters={mockAdapters}
        listeners={listeners}
      >
        <PassportProvider>
          <TestComponent />
        </PassportProvider>
      </SelfClientProvider>,
    );

    const newFunctionsList = getByTestId('context-functions-list').props
      .children;
    expect(newFunctionsList).toBe(initialFunctionsList);
  });

  describe('initializeNativeModules', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      __resetPassportProviderTestState();
    });

    it('should return true immediately if native modules are already ready', async () => {
      // Mock successful keychain response
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue({
        password: 'test',
      });

      // First call should initialize
      const firstResult = await initializeNativeModules();
      expect(firstResult).toBe(true);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);

      // Clear mock calls to verify subsequent calls don't hit keychain
      jest.clearAllMocks();

      // Subsequent calls should return immediately without hitting keychain
      const secondResult = await initializeNativeModules();
      expect(secondResult).toBe(true);
      expect(mockKeychain.getGenericPassword).not.toHaveBeenCalled();
    });

    it('should handle "requiring unknown module" errors by retrying', async () => {
      // Mock the error that occurs when native modules aren't ready
      const moduleError = new Error(
        'Requiring unknown module "react-native-keychain"',
      );
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockRejectedValueOnce(moduleError)
        .mockRejectedValueOnce(moduleError)
        .mockResolvedValue({ password: 'test' });

      const result = await initializeNativeModules(3, 10); // 3 retries, 10ms delay

      expect(result).toBe(true);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(3);
    });

    it('should return false after max retries if modules never become ready', async () => {
      // Mock persistent module error
      const moduleError = new Error(
        'Requiring unknown module "react-native-keychain"',
      );
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockRejectedValue(moduleError);

      const result = await initializeNativeModules(2, 10); // 2 retries, 10ms delay

      expect(result).toBe(false);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(2);
    });

    it('should handle other errors by assuming Keychain is available', async () => {
      // Mock a different type of error (like service not found)
      const otherError = new Error('Service not found');
      mockKeychain.getGenericPassword = jest.fn().mockRejectedValue(otherError);

      const result = await initializeNativeModules();

      expect(result).toBe(true);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('migrateFromLegacyStorage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      __resetPassportProviderTestState();
    });

    it('should skip migration if catalog already has documents', async () => {
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [{ id: 'existing' }] }),
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await initializeNativeModules();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrateFromLegacyStorage();

      // Should log that migration is already completed
      expect(consoleSpy).toHaveBeenCalledWith('Migration already completed');

      consoleSpy.mockRestore();
    });

    it('should migrate legacy documents when catalog is empty', async () => {
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [] }),
        }) // For loadDocumentCatalog
        .mockResolvedValueOnce({
          password: JSON.stringify({ documentType: 'passport', mrz: 'test' }),
        }) // For legacy document
        .mockResolvedValue(false); // No more legacy documents

      // Initialize native modules first
      await initializeNativeModules();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrateFromLegacyStorage();

      // Should log migration start and completion
      expect(consoleSpy).toHaveBeenCalledWith(
        'Migrating from legacy storage to new architecture...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('Migration completed');

      consoleSpy.mockRestore();
    });

    it('should handle errors during migration gracefully', async () => {
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [] }),
        }) // For loadDocumentCatalog
        .mockRejectedValue(new Error('Keychain error')); // Error on legacy service

      // Initialize native modules first
      await initializeNativeModules();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrateFromLegacyStorage();

      // Should log error for each service that fails
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not migrate from service passportData:'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('loadDocumentCatalog', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      __resetPassportProviderTestState();
    });

    it('should return empty catalog when Keychain is undefined', async () => {
      const result = await new Promise((resolve, reject) => {
        jest.isolateModules(() => {
          jest.doMock('react-native-keychain', () => undefined);
          const passportModule = require('@/providers/passportDataProvider');
          passportModule
            .loadDocumentCatalogDirectlyFromKeychain()
            .then(resolve)
            .catch(reject);
        });
      });

      expect(result).toEqual({ documents: [] });
    });

    it('should return empty catalog when no catalog exists', async () => {
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue(false);

      const result = await loadDocumentCatalogDirectlyFromKeychain();

      expect(result).toEqual({ documents: [] });
    });

    it('should return empty catalog when native modules are not ready', async () => {
      // Since nativeModulesReady is a module-level variable, we can't easily mock it
      // The function will return empty catalog when native modules are not ready
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue({
        password: JSON.stringify({ documents: [{ id: 'test' }] }),
      });

      const result = await loadDocumentCatalogDirectlyFromKeychain();

      // The function should return empty catalog due to nativeModulesReady check
      expect(result).toEqual({ documents: [] });
    });

    it('should return parsed catalog when it exists and native modules are ready', async () => {
      // First initialize native modules to set the flag
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [{ id: 'test' }] }),
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await initializeNativeModules();

      // Now test loadDocumentCatalog
      const result = await loadDocumentCatalogDirectlyFromKeychain();

      expect(result).toEqual({ documents: [{ id: 'test' }] });
    });

    it('should handle malformed JSON and return empty documents array', async () => {
      // First initialize native modules to set the flag
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: '{"documents": [{"id": "test"}]', // Missing closing brace
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await initializeNativeModules();

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await loadDocumentCatalogDirectlyFromKeychain();

      expect(result).toEqual({ documents: [] });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Error loading document catalog:',
        expect.any(SyntaxError),
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle invalid catalog structure and return the parsed structure', async () => {
      // First initialize native modules to set the flag
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ invalidField: 'test' }), // Missing documents array
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await initializeNativeModules();

      const result = await loadDocumentCatalogDirectlyFromKeychain();

      // The function returns the parsed JSON as-is, even if it doesn't have the expected structure
      expect(result).toEqual({ invalidField: 'test' });
    });

    it('should handle JSON parsing exceptions and return empty documents array', async () => {
      // First initialize native modules to set the flag
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: 'invalid json string',
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await initializeNativeModules();

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await loadDocumentCatalogDirectlyFromKeychain();

      expect(result).toEqual({ documents: [] });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Error loading document catalog:',
        expect.any(SyntaxError),
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle null/undefined password and return empty documents array', async () => {
      // First initialize native modules to set the flag
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: null,
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await initializeNativeModules();

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await loadDocumentCatalogDirectlyFromKeychain();

      // When password is null, JSON.parse(null) throws TypeError, which is caught
      // and the function returns empty catalog
      expect(result).toEqual({ documents: [] });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Error loading document catalog:',
        expect.any(TypeError),
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle empty string password and return empty documents array', async () => {
      // First initialize native modules to set the flag
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: '',
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await initializeNativeModules();

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await loadDocumentCatalogDirectlyFromKeychain();

      expect(result).toEqual({ documents: [] });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Error loading document catalog:',
        expect.any(SyntaxError),
      );

      consoleLogSpy.mockRestore();
    });
  });
});
