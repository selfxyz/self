// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { renderHook, waitFor } from '@testing-library/react-native';

import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { useAadhaarNameOptions } from '@/hooks/useAadhaarNameOptions';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
  loadSelectedDocument: jest.fn(),
}));

describe('useAadhaarNameOptions', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockTrackEvent = jest.fn();

  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
  };

  const mockSelfClient = {
    trackEvent: mockTrackEvent,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    (useSelfClient as jest.Mock).mockReturnValue(mockSelfClient);
  });

  describe('successful data loading', () => {
    it('should load name parts and track NAME_OPTIONS_LOADED event', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: 'John Doe Smith',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
          firstNameIndex: -1,
          lastNameIndex: -1,
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      const { result } = renderHook(() =>
        useAadhaarNameOptions(mockNavigation as any),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.nameParts).toEqual(['John', 'Doe', 'Smith']);
      expect(result.current.firstNameIndex).toBe(-1);
      expect(result.current.lastNameIndex).toBe(-1);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        AadhaarEvents.NAME_OPTIONS_LOADED,
        {
          optionCount: 3,
        },
      );
    });

    it('should handle existing name indices from metadata', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: 'Jane Marie Smith',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
          firstNameIndex: 0,
          lastNameIndex: 2,
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      const { result } = renderHook(() =>
        useAadhaarNameOptions(mockNavigation as any),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.firstNameIndex).toBe(0);
      expect(result.current.lastNameIndex).toBe(2);
    });

    it('should handle undefined name indices (backwards compatibility)', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: 'John Doe',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
          // No firstNameIndex or lastNameIndex fields
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      const { result } = renderHook(() =>
        useAadhaarNameOptions(mockNavigation as any),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.firstNameIndex).toBe(-1);
      expect(result.current.lastNameIndex).toBe(-1);
    });

    it('should handle names with extra whitespace', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: '  John   Doe   Smith  ',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      const { result } = renderHook(() =>
        useAadhaarNameOptions(mockNavigation as any),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.nameParts).toEqual(['John', 'Doe', 'Smith']);
    });
  });

  describe('error handling - AADHAAR_DATA_NOT_FOUND', () => {
    it('should track AADHAAR_DATA_NOT_FOUND when no document found', async () => {
      (loadSelectedDocument as jest.Mock).mockResolvedValue(null);

      renderHook(() => useAadhaarNameOptions(mockNavigation as any));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          AadhaarEvents.AADHAAR_DATA_NOT_FOUND,
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('AadhaarUpload', {
        countryCode: 'IN',
      });
    });

    it('should track AADHAAR_DATA_NOT_FOUND when data category is not aadhaar', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'passport',
          extractedFields: {
            name: 'John Doe',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      renderHook(() => useAadhaarNameOptions(mockNavigation as any));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          AadhaarEvents.AADHAAR_DATA_NOT_FOUND,
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('AadhaarUpload', {
        countryCode: 'IN',
      });
    });

    it('should track AADHAAR_DATA_NOT_FOUND when metadata category is not aadhaar', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: 'John Doe',
          },
        },
        metadata: {
          documentCategory: 'passport',
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      renderHook(() => useAadhaarNameOptions(mockNavigation as any));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          AadhaarEvents.AADHAAR_DATA_NOT_FOUND,
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('AadhaarUpload', {
        countryCode: 'IN',
      });
    });

    it('should track AADHAAR_DATA_NOT_FOUND when name field is missing', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {},
        },
        metadata: {
          documentCategory: 'aadhaar',
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      renderHook(() => useAadhaarNameOptions(mockNavigation as any));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          AadhaarEvents.AADHAAR_DATA_NOT_FOUND,
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('AadhaarUpload', {
        countryCode: 'IN',
      });
    });
  });

  describe('error handling - INVALID_NAME_FORMAT', () => {
    it('should track INVALID_NAME_FORMAT when name has only one part', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: 'John',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      renderHook(() => useAadhaarNameOptions(mockNavigation as any));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          AadhaarEvents.INVALID_NAME_FORMAT,
        );
      });

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should track AADHAAR_DATA_NOT_FOUND when name is empty', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: '',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      renderHook(() => useAadhaarNameOptions(mockNavigation as any));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          AadhaarEvents.AADHAAR_DATA_NOT_FOUND,
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('AadhaarUpload', {
        countryCode: 'IN',
      });
    });

    it('should track INVALID_NAME_FORMAT when name is only whitespace', async () => {
      const mockDocument = {
        data: {
          documentCategory: 'aadhaar',
          extractedFields: {
            name: '   ',
          },
        },
        metadata: {
          documentCategory: 'aadhaar',
        },
      };

      (loadSelectedDocument as jest.Mock).mockResolvedValue(mockDocument);

      renderHook(() => useAadhaarNameOptions(mockNavigation as any));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          AadhaarEvents.INVALID_NAME_FORMAT,
        );
      });

      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
