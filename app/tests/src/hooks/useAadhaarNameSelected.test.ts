// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { useAadhaarNameSelected } from '@/hooks/useAadhaarNameSelected';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

describe('useAadhaarNameSelected', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockLoadDocumentCatalog = jest.fn();
  const mockSaveDocumentCatalog = jest.fn();

  const mockSelfClient = {
    trackEvent: mockTrackEvent,
    loadDocumentCatalog: mockLoadDocumentCatalog,
    saveDocumentCatalog: mockSaveDocumentCatalog,
  };

  const nameOptions = ['John', 'Doe', 'Smith'];

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    (useSelfClient as jest.Mock).mockReturnValue(mockSelfClient);
  });

  describe('first name selection', () => {
    it('should update firstNameIndex and navigate to AadhaarLastNameChooser', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: -1,
            lastNameIndex: -1,
          },
          {
            id: 'doc-456',
            documentCategory: 'passport',
            someField: 'unchanged',
          },
          {
            id: 'doc-789',
            documentCategory: 'aadhaar',
            firstNameIndex: 0,
            lastNameIndex: 2,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockLoadDocumentCatalog).toHaveBeenCalledTimes(1);
      // Should update only the selected document
      expect(mockCatalog.documents[0].firstNameIndex).toBe(1);
      expect(mockCatalog.documents[0].lastNameIndex).toBe(-1);
      // Other documents should remain unchanged
      expect(mockCatalog.documents[1]).toEqual({
        id: 'doc-456',
        documentCategory: 'passport',
        someField: 'unchanged',
      });
      expect(mockCatalog.documents[2]).toEqual({
        id: 'doc-789',
        documentCategory: 'aadhaar',
        firstNameIndex: 0,
        lastNameIndex: 2,
      });
      expect(mockSaveDocumentCatalog).toHaveBeenCalledWith(mockCatalog);
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarLastNameChooser');
    });

    it('should track NAME_INDEX_SAVED event when first name is selected', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: -1,
            lastNameIndex: -1,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('Aadhaar: Name Index Saved', {
        part: 'first',
        selectedNameIndex: 1,
      });
    });

    it('should reset lastNameIndex when selecting first name', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: 0,
            lastNameIndex: 2,
          },
          {
            id: 'doc-111',
            documentCategory: 'passport',
            mrz: 'passport-data',
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockCatalog.documents[0].firstNameIndex).toBe(1);
      expect(mockCatalog.documents[0].lastNameIndex).toBe(-1);
      // Other documents should remain unchanged
      expect(mockCatalog.documents[1]).toEqual({
        id: 'doc-111',
        documentCategory: 'passport',
        mrz: 'passport-data',
      });
    });
  });

  describe('last name selection', () => {
    it('should update lastNameIndex and navigate to AadhaarNameConfirmation', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: 0,
            lastNameIndex: -1,
          },
          {
            id: 'doc-999',
            documentCategory: 'id_card',
            data: 'should-not-change',
          },
          {
            id: 'doc-888',
            documentCategory: 'aadhaar',
            firstNameIndex: 1,
            lastNameIndex: 0,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'last',
        }),
      );

      await act(async () => {
        await result.current(2);
      });

      expect(mockLoadDocumentCatalog).toHaveBeenCalledTimes(1);
      // Should update only the selected document
      expect(mockCatalog.documents[0].lastNameIndex).toBe(2);
      // Other documents should remain unchanged
      expect(mockCatalog.documents[1]).toEqual({
        id: 'doc-999',
        documentCategory: 'id_card',
        data: 'should-not-change',
      });
      expect(mockCatalog.documents[2]).toEqual({
        id: 'doc-888',
        documentCategory: 'aadhaar',
        firstNameIndex: 1,
        lastNameIndex: 0,
      });
      expect(mockSaveDocumentCatalog).toHaveBeenCalledWith(mockCatalog);
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarNameConfirmation');
    });

    it('should track NAME_INDEX_SAVED event when last name is selected', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: 0,
            lastNameIndex: -1,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'last',
        }),
      );

      await act(async () => {
        await result.current(2);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('Aadhaar: Name Index Saved', {
        part: 'last',
        selectedNameIndex: 2,
      });
    });

    it('should not reset firstNameIndex when selecting last name', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: 0,
            lastNameIndex: -1,
          },
          {
            id: 'doc-222',
            documentCategory: 'aadhaar',
            firstNameIndex: 2,
            lastNameIndex: 1,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'last',
        }),
      );

      await act(async () => {
        await result.current(2);
      });

      expect(mockCatalog.documents[0].firstNameIndex).toBe(0);
      expect(mockCatalog.documents[0].lastNameIndex).toBe(2);
      // Other Aadhaar documents should remain unchanged
      expect(mockCatalog.documents[1]).toEqual({
        id: 'doc-222',
        documentCategory: 'aadhaar',
        firstNameIndex: 2,
        lastNameIndex: 1,
      });
    });
  });

  describe('backwards compatibility', () => {
    it('should handle missing firstNameIndex and lastNameIndex fields (app update scenario)', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            // No firstNameIndex or lastNameIndex fields - backwards compatibility
          } as any,
          {
            id: 'doc-old-passport',
            documentCategory: 'passport',
            legacyField: 'should-remain',
          },
          {
            id: 'doc-new-aadhaar',
            documentCategory: 'aadhaar',
            firstNameIndex: 1,
            lastNameIndex: 2,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockLoadDocumentCatalog).toHaveBeenCalledTimes(1);
      expect(mockCatalog.documents[0].firstNameIndex).toBe(1);
      expect(mockCatalog.documents[0].lastNameIndex).toBe(-1);
      // Other documents should remain unchanged
      expect(mockCatalog.documents[1]).toEqual({
        id: 'doc-old-passport',
        documentCategory: 'passport',
        legacyField: 'should-remain',
      });
      expect(mockCatalog.documents[2]).toEqual({
        id: 'doc-new-aadhaar',
        documentCategory: 'aadhaar',
        firstNameIndex: 1,
        lastNameIndex: 2,
      });
      expect(mockSaveDocumentCatalog).toHaveBeenCalledWith(mockCatalog);
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarLastNameChooser');
    });

    it('should handle missing fields when selecting last name (app update scenario)', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            // Only firstNameIndex set, no lastNameIndex field
            firstNameIndex: 0,
          } as any,
          {
            id: 'doc-complete',
            documentCategory: 'aadhaar',
            firstNameIndex: 2,
            lastNameIndex: 0,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'last',
        }),
      );

      await act(async () => {
        await result.current(2);
      });

      expect(mockLoadDocumentCatalog).toHaveBeenCalledTimes(1);
      expect(mockCatalog.documents[0].firstNameIndex).toBe(0);
      expect(mockCatalog.documents[0].lastNameIndex).toBe(2);
      // Complete document should remain unchanged
      expect(mockCatalog.documents[1]).toEqual({
        id: 'doc-complete',
        documentCategory: 'aadhaar',
        firstNameIndex: 2,
        lastNameIndex: 0,
      });
      expect(mockSaveDocumentCatalog).toHaveBeenCalledWith(mockCatalog);
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarNameConfirmation');
    });

    it('should handle document with no name index fields when updating from legacy version', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            // Simulate old document structure with other fields but no name indices
            someOtherField: 'value',
          } as any,
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result: firstResult } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      // Select first name
      await act(async () => {
        await firstResult.current(0);
      });

      expect(mockCatalog.documents[0].firstNameIndex).toBe(0);
      expect(mockCatalog.documents[0].lastNameIndex).toBe(-1);

      // Mock the catalog with the updated first name
      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result: lastResult } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'last',
        }),
      );

      // Now select last name
      await act(async () => {
        await lastResult.current(2);
      });

      expect(mockCatalog.documents[0].firstNameIndex).toBe(0);
      expect(mockCatalog.documents[0].lastNameIndex).toBe(2);
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarNameConfirmation');
    });
  });

  describe('validation', () => {
    it('should reject negative index', async () => {
      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(-1);
      });

      expect(console.log).toHaveBeenCalledWith(
        'Invalid Aadhar name selection index',
        -1,
      );
      expect(mockLoadDocumentCatalog).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should reject index greater than array length', async () => {
      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(3);
      });

      expect(console.log).toHaveBeenCalledWith(
        'Invalid Aadhar name selection index',
        3,
      );
      expect(mockLoadDocumentCatalog).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should accept valid index at boundaries', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: -1,
            lastNameIndex: -1,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      // Test index 0
      await act(async () => {
        await result.current(0);
      });

      expect(mockLoadDocumentCatalog).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarLastNameChooser');

      jest.clearAllMocks();
      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      // Test index at length - 1
      await act(async () => {
        await result.current(2);
      });

      expect(mockLoadDocumentCatalog).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarLastNameChooser');
    });
  });

  describe('error handling', () => {
    it('should log when no document metadata found', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-456',
            documentCategory: 'aadhaar',
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(console.log).toHaveBeenCalledWith('No document metadata found');
      expect(mockSaveDocumentCatalog).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should log when document category is not aadhaar', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'passport',
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(console.log).toHaveBeenCalledWith(
        'Document category is not Aadhaar',
      );
      expect(mockSaveDocumentCatalog).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should track NAME_SELECTION_ERROR event when loadDocumentCatalog fails', async () => {
      const error = new Error('Failed to load catalog');
      mockLoadDocumentCatalog.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('Aadhaar: Name Selection Error', {
        error: 'Failed to load catalog',
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should track NAME_SELECTION_ERROR event when saveDocumentCatalog fails', async () => {
      const mockCatalog = {
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            documentCategory: 'aadhaar',
            firstNameIndex: -1,
            lastNameIndex: -1,
          },
        ],
      };

      mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);
      mockSaveDocumentCatalog.mockRejectedValue(
        new Error('Failed to save catalog'),
      );

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('Aadhaar: Name Selection Error', {
        error: 'Failed to save catalog',
      });
    });

    it('should handle non-Error objects in catch block', async () => {
      mockLoadDocumentCatalog.mockRejectedValue('String error');

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('Aadhaar: Name Selection Error', {
        error: 'String error',
      });
    });

    it('should handle unknown error types', async () => {
      mockLoadDocumentCatalog.mockRejectedValue(null);

      const { result } = renderHook(() =>
        useAadhaarNameSelected({
          nameOptions,
          part: 'first',
        }),
      );

      await act(async () => {
        await result.current(1);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('Aadhaar: Name Selection Error', {
        error: 'Unknown error',
      });
    });
  });

  describe('dependency array', () => {
    it('should memoize callback when dependencies do not change', () => {
      const { result, rerender } = renderHook(
        () =>
          useAadhaarNameSelected({
            nameOptions,
            part: 'first',
          }),
        {
          initialProps: {},
        },
      );

      const firstCallback = result.current;

      rerender({});

      expect(result.current).toBe(firstCallback);
    });

    it('should create new callback when nameOptions change', () => {
      const { result, rerender } = renderHook(
        (props: { options: string[] }) =>
          useAadhaarNameSelected({
            nameOptions: props.options,
            part: 'first',
          }),
        {
          initialProps: { options: nameOptions },
        },
      );

      const firstCallback = result.current;

      rerender({ options: ['Jane', 'Doe'] });

      expect(result.current).not.toBe(firstCallback);
    });

    it('should create new callback when part changes', () => {
      const { result, rerender } = renderHook(
        (props: { part: 'first' | 'last' }) =>
          useAadhaarNameSelected({
            nameOptions,
            part: props.part,
          }),
        {
          initialProps: { part: 'first' as const },
        },
      );

      const firstCallback = result.current;

      rerender({ part: 'last' as const });

      expect(result.current).not.toBe(firstCallback);
    });
  });
});
