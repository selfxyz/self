// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useState } from 'react';

export const useMockDataForm = () => {
  const [age, setAge] = useState(21);
  const [expiryYears, setExpiryYears] = useState(5);
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(
    'sha256 rsa 65537 2048',
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState<
    'mock_passport' | 'mock_id_card' | 'mock_aadhaar'
  >('mock_passport');
  const [isInOfacList, setIsInOfacList] = useState(false);

  const resetFormValues = () => {
    setAge(21);
    setExpiryYears(5);
    setIsInOfacList(false);
    setSelectedDocumentType('mock_passport');
    setSelectedAlgorithm('sha256 rsa 65537 2048');
    setSelectedCountry('USA');
  };

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

  const handleAlgorithmSelect = (algorithm: string) => {
    setSelectedAlgorithm(algorithm);
  };

  const handleDocumentTypeSelect = (
    documentType: 'mock_passport' | 'mock_id_card' | 'mock_aadhaar',
  ) => {
    setSelectedDocumentType(documentType);
  };

  return {
    age,
    setAge,
    expiryYears,
    setExpiryYears,
    selectedCountry,
    handleCountrySelect,
    selectedAlgorithm,
    handleAlgorithmSelect,
    selectedDocumentType,
    handleDocumentTypeSelect,
    isInOfacList,
    setIsInOfacList,
    resetFormValues,
  };
};

export default useMockDataForm;
