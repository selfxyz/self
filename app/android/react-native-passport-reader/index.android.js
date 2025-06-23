//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { NativeModules } from 'react-native'

const { RNPassportReader } = NativeModules
const DATE_REGEX = /^\d{6}$/

module.exports = {
  ...RNPassportReader,
  scan
}

function scan({ documentNumber, dateOfBirth, dateOfExpiry, canNumber, useCan, quality=1 }) {
  assert(typeof documentNumber === 'string', 'expected string "documentNumber"')
  assert(isDate(dateOfBirth), 'expected string "dateOfBirth" in format "yyMMdd"')
  assert(isDate(dateOfExpiry), 'expected string "dateOfExpiry" in format "yyMMdd"')
  return RNPassportReader.scan({ documentNumber, dateOfBirth, dateOfExpiry, quality, useCan, canNumber })
}


function assert (statement, err) {
  if (!statement) {
    throw new Error(err || 'Assertion failed')
  }
}

function isDate (str) {
  return typeof str === 'string' && DATE_REGEX.test(str)
}
