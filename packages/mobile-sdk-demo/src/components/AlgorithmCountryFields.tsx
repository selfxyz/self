// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { countryCodes } from '@selfxyz/common';
import { signatureAlgorithmToStrictSignatureAlgorithm } from '@selfxyz/mobile-sdk-alpha';
import { PickerField } from './PickerField';

const algorithmOptions = Object.keys(signatureAlgorithmToStrictSignatureAlgorithm);
const countryOptions = Object.keys(countryCodes);

export function AlgorithmCountryFields({
  show,
  algorithm,
  setAlgorithm,
  country,
  setCountry,
}: {
  show: boolean;
  algorithm: string;
  setAlgorithm: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
}) {
  if (!show) return null;
  return (
    <>
      <PickerField
        label="Algorithm"
        selectedValue={algorithm}
        onValueChange={setAlgorithm}
        items={algorithmOptions.map(alg => ({ label: alg, value: alg }))}
      />
      <PickerField
        label="Country"
        selectedValue={country}
        onValueChange={setCountry}
        items={countryOptions.map(code => ({
          label: `${code} - ${countryCodes[code as keyof typeof countryCodes]}`,
          value: code,
        }))}
      />
    </>
  );
}
